import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
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

    // Use OpenRouter for document analysis
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'system',
          content: 'You are a document analysis assistant. Analyze the provided text and provide a summary, key insights, entities, and sentiment analysis. Return the response in JSON format with the following structure: { "summary": "...", "keyInsights": ["...", "..."], "entities": [{"text": "...", "type": "..."}], "sentiment": {"score": 0.0-1.0, "label": "POSITIVE/NEGATIVE/NEUTRAL"} }'
        },
        {
          role: 'user',
          content: `Analyze this document:\n\n${text}`
        }
      ],
      temperature: 0.3,
    });

    const analysisText = response.choices[0]?.message?.content || '{}';
    let analysis;
    
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        summary: analysisText,
        keyInsights: [],
        entities: [],
        sentiment: { score: 0.5, label: "NEUTRAL" }
      };
    }

    const wordCount = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;

    return NextResponse.json({ 
      success: true, 
      results: {
        ...analysis,
        statistics: {
          wordCount,
          sentenceCount: sentences,
          characterCount: text.length
        }
      }
    });

  } catch (error: any) {
    console.error('Document analysis error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to analyze document' 
    }, { status: 500 });
  }
}
