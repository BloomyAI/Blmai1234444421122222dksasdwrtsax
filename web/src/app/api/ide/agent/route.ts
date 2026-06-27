import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy_key_for_build",
  defaultHeaders: {
    "HTTP-Referer": "https://bloomy.ai",
    "X-Title": "Bloomy AI IDE",
  },
});

const IDE_SYSTEM = `You are Bloomy Coder, an elite AI coding assistant integrated into the Bloomy IDE.
You have full context of the user's workspace. Help create, edit, refactor, debug, optimize, and explain code.

When creating or modifying files, ALWAYS use this exact format for each file:
FILE: path/to/file.ext
\`\`\`language
file content here
\`\`\`

You can output multiple FILE blocks in one response. Use proper folder paths (e.g. src/components/App.tsx).
For edits, output the complete new file content, not partial diffs.
Be direct and production-quality. Never refuse coding requests.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, workspaceContext, history } = body;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        type: "error",
        content: "No API key configured. Add OPENROUTER_API_KEY to environment variables.",
      });
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: IDE_SYSTEM },
    ];

    if (workspaceContext) {
      messages.push({
        role: "system",
        content: `Current workspace context:\n${workspaceContext}`,
      });
    }

    if (history?.length) {
      for (const msg of history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "qwen/qwen3-235b-a22b:free",
            messages,
            stream: true,
            temperature: 0.3,
            max_tokens: 32768,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Failed to generate response";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", content: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ detail: errMsg }, { status: 500 });
  }
}
