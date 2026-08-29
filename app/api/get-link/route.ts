import { NextResponse } from 'next/server';
import { getCleanLink } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'الرابط مطلوب' }, { status: 400 });
  }

  try {
    const links = await getCleanLink(url);
    return NextResponse.json({ success: true, data: links });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
