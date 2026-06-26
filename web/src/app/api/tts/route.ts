import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key_for_build',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://bloomy.ai',
    'X-Title': 'Bloomy AI',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter API key is not configured' }, { status: 500 });
    }

    // Use OpenRouter for text generation (TTS requires dedicated TTS API)
    // For now, we'll return the text as-is since actual TTS requires a dedicated service
    // In production, you would use a TTS service like ElevenLabs, OpenAI TTS, or similar
    
    return NextResponse.json({ 
      success: true, 
      audio: null,
      text: text,
      note: 'Text-to-speech requires a dedicated TTS API. This is a placeholder response.'
    });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate speech' 
    }, { status: 500 });
  }
}
