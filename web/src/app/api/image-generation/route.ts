import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://bloomy.ai',
    'X-Title': 'Bloomy AI',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 500 });
    }

    // Use OpenRouter for image generation
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      messages: [
        {
          role: 'system',
          content: 'You are an image generation assistant. When asked to generate an image, describe the image in detail that would be generated. Return the description only.'
        },
        {
          role: 'user',
          content: `Generate an image of: ${prompt}`
        }
      ],
      temperature: 0.7,
    });

    const description = response.choices[0]?.message?.content || 'Image generation description';

    // For now, return a placeholder since actual image generation requires specific image models
    // In production, you would use a dedicated image generation API
    return NextResponse.json({ 
      success: true, 
      image: null,
      description: description,
      note: 'Image generation requires a dedicated image API. This is a placeholder response.'
    });

  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate image' 
    }, { status: 500 });
  }
}
