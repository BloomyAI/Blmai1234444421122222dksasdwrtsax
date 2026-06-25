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

    // Use alibaba/happyhorse-1.0 for video generation
    const result = await hf.textToImage({
      model: 'alibaba/happyhorse-1.0',
      inputs: prompt,
    });

    // Convert blob to base64
    const arrayBuffer = await result.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ 
      success: true, 
      video: dataUrl 
    });

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate video' 
    }, { status: 500 });
  }
}
