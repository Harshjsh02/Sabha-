import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const body = await req.json().catch(() => ({}));
    const { uid, email, displayName } = body;

    return NextResponse.json({
      success: true,
      ip,
      userAgent,
      timestamp: Date.now(),
      uid,
      email,
      displayName,
    });
  } catch (error) {
    console.error('Error in record-login API route:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
