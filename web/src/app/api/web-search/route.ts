import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Use a web search API (e.g., SerpAPI, Bing Search API, or similar)
    // For now, using DuckDuckGo as a free option
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=0`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    const results = data.RelatedTopics?.map((topic: any) => ({
      title: topic.Text || topic.FirstURL,
      url: topic.FirstURL,
      snippet: topic.Text || '',
    })).filter((r: any) => r.url && !r.url.startsWith('//')) || [];

    return NextResponse.json({ 
      success: true, 
      results: results.slice(0, 10) 
    });

  } catch (error: any) {
    console.error('Web search error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to perform web search' 
    }, { status: 500 });
  }
}
