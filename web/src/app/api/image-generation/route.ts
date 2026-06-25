import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!hf) {
      return NextResponse.json({ error: 'HuggingFace API key is not configured' }, { status: 500 });
    }

    // Use google/gemini-3.1-flash-image for image generation
    const result = await hf.textToImage({
      model: 'google/gemini-3.1-flash-image',
      inputs: prompt,
    });

    // Convert blob to base64
    const arrayBuffer = await result.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ 
      success: true, 
      image: dataUrl 
    });

  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate image' 
    }, { status: 500 });
  }
}
