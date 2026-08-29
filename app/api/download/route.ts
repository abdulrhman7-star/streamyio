import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ success: false, error: 'رابط الفيديو مطلوب' }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'Referer': 'https://ak.sv/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const response = await fetch(videoUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    responseHeaders.set('Content-Disposition', 'attachment; filename="downloaded_video.mp4"'); // يمكن تحسين اسم الملف
    
    if (response.headers.has('content-length')) {
      responseHeaders.set('Content-Length', response.headers.get('content-length') as string);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return new Response('فشل في تحميل الفيديو', { status: 500 });
  }
}
