import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

const VIDEO_MODEL = 'wan-fast';
const POLLINATIONS_GEN_URL = 'https://gen.pollinations.ai';

function pollinationsHeaders(): Record<string, string> {
  const key = process.env.POLLINATIONS_API_KEY;
  const headers: Record<string, string> = { Referer: 'https://bloomy.ai' };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function buildPollinationsVideoUrl(prompt: string, duration: number): string {
  const params = new URLSearchParams({
    model: VIDEO_MODEL,
    duration: String(Math.min(Math.max(duration, 5), 5)),
    nologo: 'true',
  });
  return `${POLLINATIONS_GEN_URL}/video/${encodeURIComponent(prompt)}?${params}`;
}

async function generateWithPollinations(prompt: string, duration: number): Promise<string | null> {
  const videoUrl = buildPollinationsVideoUrl(prompt, duration);

  try {
    const res = await fetch(videoUrl, {
      method: 'GET',
      headers: pollinationsHeaders(),
      redirect: 'follow',
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        return videoUrl;
      }
    }

    if (res.status === 401 || res.status === 402 || res.status === 403) {
      return null;
    }
  } catch (e) {
    console.error('Pollinations video error:', e);
  }
  return null;
}

async function searchPexelsVideo(prompt: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const query = encodeURIComponent(prompt.split(' ').slice(0, 6).join(' '));
    const res = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=1`, {
      headers: { Authorization: key },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const video = data.videos?.[0];
    const file =
      video?.video_files?.find((f: { quality?: string }) => f.quality === 'hd') ??
      video?.video_files?.[0];
    return file?.link ?? null;
  } catch (e) {
    console.error('Pexels video error:', e);
    return null;
  }
}

async function searchGiphyVideo(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(prompt)}&limit=1`
    );
    const data = await res.json();
    return data.data?.[0]?.images?.original?.mp4 ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, duration = 5 } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const trimmed = prompt.trim();
    let video: string | null = null;
    let provider = '';

    video = await generateWithPollinations(trimmed, duration);
    if (video) provider = `Pollinations ${VIDEO_MODEL}`;

    if (!video) {
      video = await searchPexelsVideo(trimmed);
      if (video) provider = 'Pexels (stock video)';
    }

    if (!video) {
      video = await searchGiphyVideo(trimmed);
      if (video) provider = 'Giphy preview clip';
    }

    if (!video) {
      return NextResponse.json(
        {
          error:
            'No free video source available. Add POLLINATIONS_API_KEY (free at enter.pollinations.ai) for AI video, or try a different prompt.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      video,
      description: trimmed,
      model: VIDEO_MODEL,
      provider,
      note:
        provider === 'Giphy preview clip'
          ? 'Showing a related clip. Set POLLINATIONS_API_KEY for AI-generated video with Wan 2.2 Fast.'
          : undefined,
    });
  } catch (error: unknown) {
    console.error('Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
