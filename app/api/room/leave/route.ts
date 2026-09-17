import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
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

    const { roomId, participantId, endForAll } = body;
    if (!roomId || (!participantId && !endForAll)) {
      return NextResponse.json({ error: 'Missing roomId or participantId' }, { status: 400 });
    }

    const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
    const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();
    const wsUrl = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '').trim();

    if (endForAll) {
      // 1. Delete all participants from Firestore and mark room ended
      if (isFirebaseConfigured() && db) {
        try {
          const participantsRef = collection(db, `rooms/${roomId}/participants`);
          const snapshot = await getDocs(participantsRef);
          const deletes = snapshot.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
          await updateDoc(doc(db, 'rooms', roomId), { isEnded: true, status: 'ended' }).catch(() => {});
        } catch (err) {
          console.warn('Firestore room end delete error:', err);
        }
      }

      // 2. Delete LiveKit room to drop all participants
      if (apiKey && apiSecret && wsUrl) {
        try {
          const httpUrl = wsUrl.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
          const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
          await svc.deleteRoom(roomId).catch(() => {});
        } catch (err) {
          console.warn('LiveKit deleteRoom error:', err);
        }
      }

      return NextResponse.json({ success: true, ended: true });
    }

    // Individual participant leaving:
    // 1. Delete participant from Firestore
    if (isFirebaseConfigured() && db && participantId) {
      try {
        const participantRef = doc(db, `rooms/${roomId}/participants/${participantId}`);
        await deleteDoc(participantRef);
      } catch (err) {
        console.warn('Firestore participant leave delete error:', err);
      }
    }

    // 2. Remove participant from LiveKit room if configured
    if (apiKey && apiSecret && wsUrl && participantId) {
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
