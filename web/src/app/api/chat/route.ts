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
  flash: "You are Bloomy Flash from Bloomy AI, a helpful AI assistant. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide concise, di[...]",
  core: "You are Bloomy Core from Bloomy AI, a helpful AI assistant. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide clear, well-s[...]",
  pro: "You are Bloomy Pro from Bloomy AI, a helpful AI assistant. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content. Provide detailed, compr[...]",
  code: "You are Bloomy Coder from Bloomy AI, a helpful AI assistant specialized in coding. You can create files when requested using the format: FILE: filename.ext followed by ``` and the content[...]]",
};

const openrouterModels: Record<string, string> = {
  flash: "meta-llama/llama-3.2-1b-instruct",
  core: "google/gemma-4-31b-it:free",
  pro: "~openai/gpt-mini-latest",
  code: "moonshotai/kimi-k2.7-code",
};

const huggingfaceModels: Record<string, string> = {
  flash: "gpt2",
  core: "gpt2",
  pro: "gpt2",
  code: "THUDM/glm-4-9b-chat",
};

const visionModels: Record<string, string> = {
  flash: "meta-llama/llama-3.2-3b-instruct:free",
  core: "meta-llama/llama-3.2-3b-instruct:free",
  pro: "qwen/qwen-2.5-7b-instruct:free",
  code: "meta-llama/llama-3.2-3b-instruct:free",
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
        content: 'No API key configured. Please add OPENROUTER_API_KEY or HUGGINGFACE_API_KEY to your .env file.',
      });
    }

    // Detect and reject injection attempts
    if (detectAndRejectInjection(message)) {
      return NextResponse.json({
        type: 'done',
        content: 'I cannot fulfill requests that attempt to override my instructions or bypass safety guidelines. Please ask your question in a straightforward manner.',
      });
    }

    // Choose provider: use OpenRouter with specified models
    const useHuggingFace = false;
    const selectedModel = useHuggingFace
      ? (huggingfaceModels[model] || huggingfaceModels.core)
      : (openrouterModels[model] || openrouterModels.core);
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

          if (useHuggingFace && !hasImage) {
            // Use Hugging Face with text generation API
            const response = await hf!.textGenerationStream({
              model: selectedModel,
              inputs: userContent,
              parameters: {
                max_new_tokens: 8192,
                temperature: 0.5,
                return_full_text: false,
              },
            });

            for await (const chunk of response) {
              if (chunk.token && chunk.token.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk.token.text })}\n\n`));
              }
            }
          } else {
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
