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

    // تمرير طلب النطاق (Range) إذا وجد لدعم التقديم والتأخير في الفيديو
    const range = request.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(videoUrl, {
      headers,
      // لا نريد أن يقوم fetch بتحميل الملف كاملًا بل قراءة كتدفق (Stream)
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    // إعداد الترويسات الخاصة بالرد
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('content-type') || 'video/mp4');
    
    if (response.headers.has('content-length')) {
      responseHeaders.set('Content-Length', response.headers.get('content-length') as string);
    }
    if (response.headers.has('content-range')) {
      responseHeaders.set('Content-Range', response.headers.get('content-range') as string);
    }
    if (response.headers.has('accept-ranges')) {
      responseHeaders.set('Accept-Ranges', response.headers.get('accept-ranges') as string);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('Streaming error:', error);
    return new Response('فشل في تشغيل الفيديو', { status: 500 });
  }
}
