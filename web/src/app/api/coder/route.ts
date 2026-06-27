import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  CODER_MAX_TOKENS,
  CODER_SYSTEM_PROMPT,
  CODER_VISION_MODEL,
  coderModelsToTry,
  isRetryableCoderError,
} from '@/lib/coder-models';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key_for_build',
  defaultHeaders: {
    'HTTP-Referer': 'https://bloomy.ai',
    'X-Title': 'Bloomy Coder',
  },
});

async function streamCompletion(
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
  onChunk: (text: string) => void
): Promise<void> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature: 0.3,
    max_tokens: CODER_MAX_TOKENS,
    presence_penalty: 0,
    frequency_penalty: 0,
  });

  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) onChunk(content);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, attachments, history } = body;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        type: 'error',
        content: 'No API key configured. Add OPENROUTER_API_KEY to environment variables.',
      });
    }

    let userContent = message;
    let hasImage = false;
    const imageContent: { type: 'image_url'; image_url: { url: string } }[] = [];

    if (attachments?.length) {
      const attachmentInfo = attachments
        .map((a: { type?: string; name: string; size: number; url?: string }) => {
          if (a.type?.startsWith('image/') && a.url) {
            hasImage = true;
            imageContent.push({ type: 'image_url', image_url: { url: a.url } });
            return `[Image: ${a.name}]`;
          }
          return `[Attached file: ${a.name} (${a.type}, ${Math.round(a.size / 1024)}KB)]`;
        })
        .join('\n');
      userContent = `${attachmentInfo}\n\n${message}`;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: CODER_SYSTEM_PROMPT },
        ];

        if (Array.isArray(history)) {
          for (const msg of history.slice(-12)) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content });
            }
          }
        }

        if (hasImage) {
          messages.push({
            role: 'user',
            content: [{ type: 'text', text: userContent }, ...imageContent],
          });
        } else {
          messages.push({ role: 'user', content: userContent });
        }

        const modelsToTry = hasImage ? [CODER_VISION_MODEL] : coderModelsToTry();
        let lastError: unknown = null;

        for (let i = 0; i < modelsToTry.length; i++) {
          const tryModel = modelsToTry[i];
          try {
            await streamCompletion(tryModel, messages, (content) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`)
              );
            });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          } catch (error) {
            lastError = error;
            console.error(`Coder model ${tryModel} failed:`, error);
            if (i < modelsToTry.length - 1 && isRetryableCoderError(error)) continue;
            break;
          }
        }

        const err = lastError as { status?: number; message?: string };
        let errorMessage = err?.message || 'Failed to generate response';
        if (err?.status === 401) {
          errorMessage = 'OpenRouter API key invalid. Verify OPENROUTER_API_KEY.';
        } else if (err?.status === 402 || errorMessage.toLowerCase().includes('insufficient credits')) {
          errorMessage =
            'Coder free models unavailable right now. Try again in a few minutes or add OpenRouter credits.';
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Coder API error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
