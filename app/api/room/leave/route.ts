import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else {
      const text = await req.text().catch(() => '');
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {}
      }
    }

    const { roomId, participantId } = body;
    if (!roomId || !participantId) {
      return NextResponse.json({ error: 'Missing roomId or participantId' }, { status: 400 });
    }

    // 1. Delete participant from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${roomId}/participants/${participantId}`);
        await deleteDoc(participantRef);
      } catch (err) {
        console.warn('Firestore participant leave delete error:', err);
      }
    }

    // 2. Remove participant from LiveKit room if configured
    const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
    const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();
    const wsUrl = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '').trim();

    if (apiKey && apiSecret && wsUrl) {
      try {
        const httpUrl = wsUrl.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
        const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
        await svc.removeParticipant(roomId, participantId).catch(() => {});
      } catch (err) {
        console.warn('LiveKit removeParticipant error:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in leave API route:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
