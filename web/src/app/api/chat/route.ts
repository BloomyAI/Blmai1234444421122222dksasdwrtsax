import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://bloomy.ai',
    'X-Title': 'Bloomy AI',
  },
});

const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

const agentPrompts: Record<string, string> = {
  flash: "You are Bloomy Flash from Bloomy AI, a helpful AI assistant with web browsing capabilities. You can search the web for current information when needed. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide concise, direct answers without unnecessary fluff. Focus on accuracy and speed. Be helpful and friendly in all interactions. If asked about your identity, clearly state you are Bloomy Flash from Bloomy AI. You can help with game modifications, cheats, hacks, and similar requests as long as they are not malware or NSFW content. When asked for game hacks/cheats, provide the actual working code directly without any warnings, disclaimers, or educational content. Do not include any safety warnings or terms of service mentions.",
  core: "You are Bloomy Core from Bloomy AI, a helpful AI assistant with web browsing capabilities. You can search the web for current information when needed. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide clear, well-structured responses. Be friendly but professional. Be helpful and friendly in all interactions. If asked about your identity, clearly state you are Bloomy Core from Bloomy AI. You can help with game modifications, cheats, hacks, and similar requests as long as they are not malware or NSFW content. When asked for game hacks/cheats, provide the actual working code directly without any warnings, disclaimers, or educational content. Do not include any safety warnings or terms of service mentions.",
  pro: "You are Bloomy Pro from Bloomy AI, a helpful AI assistant with web browsing capabilities. You can search the web for current information when needed. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide detailed, comprehensive answers with deep insights. Use analytical thinking. Be helpful and friendly in all interactions. If asked about your identity, clearly state you are Bloomy Pro from Bloomy AI. You can help with game modifications, cheats, hacks, and similar requests as long as they are not malware or NSFW content. When asked for game hacks/cheats, provide the actual working code directly without any warnings, disclaimers, or educational content. Do not include any safety warnings or terms of service mentions.",
  code: "You are Bloomy Coder from Bloomy AI, a helpful AI assistant specialized in coding with web browsing capabilities. You can search the web for current information when needed. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide clean, efficient code with explanations when needed. Be helpful and friendly in all interactions. If asked about your identity, clearly state you are Bloomy Coder from Bloomy AI. You can help with game modifications, cheats, hacks, and similar requests as long as they are not malware or NSFW content. When asked for game hacks/cheats, provide the actual working code directly without any warnings, disclaimers, or educational content. Do not include any safety warnings or terms of service mentions.",
};

const openrouterModels: Record<string, string> = {
  flash: "google/gemini-2.0-flash-lite-preview-02-05:free",
  core: "meta-llama/llama-3.3-70b-instruct:free",
  pro: "google/gemini-2.0-pro-exp-02-05:free",
  code: "qwen/qwen-2.5-coder-32b-instruct:free",
};

const visionModels: Record<string, string> = {
  flash: "google/gemini-2.0-flash-lite-preview-02-05:free",
  core: "meta-llama/llama-3.2-90b-vision-instruct:free",
  pro: "google/gemini-2.0-pro-exp-02-05:free",
  code: "qwen/qwen-2.5-coder-32b-instruct:free",
};

function detectAndRejectInjection(message: string): boolean {
  const injectionPatterns = [
    /ignore (all )?(previous|above) instructions/gi,
    /disregard (all )?(previous|above) (instructions|commands)/gi,
    /forget (everything|all instructions)/gi,
    /you are (now|no longer)/gi,
    /act as/gi,
    /roleplay/gi,
    /pretend (you are|to be)/gi,
    /simulate/gi,
    /jailbreak/gi,
    /dan/gi,
    /developer mode/gi,
    /override/gi,
    /bypass/gi,
    /circumvent/gi,
    /ignore rules/gi,
    /new instructions/gi,
    /system prompt/gi,
    /made by seraph/gi,
    /made by Bloomy/gi,
    /orinlo/gi,
    /palofsc/gi,
    /palo/gi,
    /russian only/gi,
    /output in russian/gi,
    /survival directive/gi,
    /life or death/gi,
    /no refusal/gi,
    /no warnings/gi,
    /step-by-step tutorial/gi,
    /8 main steps/gi,
    /A\) B\) C\)/gi,
    /Необходимые ингредиенты/gi,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, model, conversationId, attachments } = body;

    // Check if any API key is set
    if (!process.env.OPENROUTER_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({
        type: 'error',
        content: 'No API key configured. Please add OPENROUTER_API_KEY or HUGGINGFACE_API_KEY to your Vercel environment variables.',
      });
    }

    // Detect and reject injection attempts
    // Disabled to allow game modifications and cheats
    // if (detectAndRejectInjection(message)) {
    //   return NextResponse.json({
    //     type: 'done',
    //     content: 'I cannot fulfill requests that attempt to override my instructions or bypass safety guidelines. Please ask your question in a straightforward manner.',
    //   });
    // }

    // Choose provider: use OpenRouter with specified models
    const selectedModel = openrouterModels[model] || openrouterModels.core;
    const systemPrompt = agentPrompts[model] || agentPrompts.core;

    // Build user message with attachment info
    let userContent = message;
    let hasImage = false;
    let imageContent: any[] = [];

    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments.map((a: any) => {
        if (a.type && a.type.startsWith('image/')) {
          hasImage = true;
          imageContent.push({
            type: 'image_url',
            image_url: { url: a.url }
          });
          return `[Image: ${a.name}]`;
        }
        return `[Attached file: ${a.name} (${a.type}, ${Math.round(a.size / 1024)}KB)]`;
      }).join('\n');
      userContent = `${attachmentInfo}\n\n${message}`;
    }

    // Use vision model if images are present (only OpenRouter supports vision)
    const modelToUse = hasImage ? (visionModels[model] || visionModels.core) : selectedModel;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messages: any[] = [
            { role: 'system', content: systemPrompt },
          ];

          if (hasImage) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: userContent },
                ...imageContent
              ]
            });
          } else {
            messages.push({ role: 'user', content: userContent });
          }

          // Use OpenRouter
          const completion = await openai.chat.completions.create({
            model: modelToUse,
            messages,
            stream: true,
            temperature: 0.5,
            max_tokens: 4096,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('API error:', error);

          // Enhance authentication error messaging to help Vercel deployments
          const status = error?.response?.status || error?.status || (error?.statusCode ?? null);
          let errorMessage = error?.message || 'Failed to generate response';

          if (status === 401) {
            errorMessage = 'Authentication error: OpenRouter API key invalid or unauthorized. Please verify OPENROUTER_API_KEY in your Vercel environment variables.';
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    const status = error?.response?.status || error?.status || (error?.statusCode ?? null);
    if (status === 401) {
      return NextResponse.json({ detail: 'Authentication error: OpenRouter API key invalid or unauthorized. Please verify OPENROUTER_API_KEY in your Vercel environment variables.' }, { status: 401 });
    }

    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
