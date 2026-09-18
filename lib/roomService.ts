import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ChatMessage, ReactionItem, RoomSettings, WaitingParticipant, Participant } from './types';

export async function createRoom(
  roomId: string,
  hostId: string,
  hostName: string
): Promise<RoomSettings> {
  const defaultSettings: RoomSettings = {
    roomId,
    hostId,
    hostName,
    title: `Sabha ${roomId}`,
    isLocked: false,
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
    requireVideo: false,
    waitingRoomEnabled: true,
    hostJoined: false,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured() || !db) {
    return defaultSettings;
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, defaultSettings);
    return defaultSettings;
  } catch (err) {
    console.warn('Error creating room in Firestore:', err);
    return defaultSettings;
  }
}

export async function getOrCreateRoom(
  roomId: string,
  hostId: string,
  hostName: string
): Promise<RoomSettings> {
  const defaultSettings: RoomSettings = {
    roomId,
    hostId,
    hostName,
    title: `Sabha ${roomId}`,
    isLocked: false,
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
    requireVideo: false,
    waitingRoomEnabled: true,
    hostJoined: false,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured() || !db) {
    return defaultSettings;
  }

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);

    if (snap.exists()) {
      return snap.data() as RoomSettings;
    } else {
      await setDoc(roomRef, defaultSettings);
      return defaultSettings;
    }
  } catch (err) {
    console.warn('Error accessing room in Firestore:', err);
    return defaultSettings;
  }
}

export async function updateRoomSettings(roomId: string, updates: Partial<RoomSettings>): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, updates);
  } catch (err) {
    console.warn('Error updating room settings:', err);
  }
}

export function subscribeToRoomSettings(
  roomId: string,
  callback: (settings: RoomSettings) => void
): () => void {
  if (!isFirebaseConfigured() || !db) {
    return () => {};
  }
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as RoomSettings);
    }
  });
}

// In-meeting Chat
export async function sendChatMessage(roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
  const fullMessage: Omit<ChatMessage, 'id'> = {
    ...message,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(`sabha_chat_${roomId}`);
    channel.postMessage({ id: 'msg_' + Math.random().toString(36).substr(2, 9), ...fullMessage });
    channel.close();
  }

  if (isFirebaseConfigured() && db) {
    try {
      const messagesCol = collection(db, `rooms/${roomId}/messages`);
      await addDoc(messagesCol, fullMessage);
    } catch (err) {
      console.warn('Could not save chat message to Firestore:', err);
    }
  }
}

export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  let localMessages: ChatMessage[] = [];
  let broadcastChannel: BroadcastChannel | null = null;

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(`sabha_chat_${roomId}`);
    broadcastChannel.onmessage = (event) => {
      localMessages = [...localMessages, event.data];
      callback(localMessages);
    };
  }

  if (isFirebaseConfigured() && db) {
    const messagesCol = collection(db, `rooms/${roomId}/messages`);
    const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(100));

    const unsubFirestore = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) });
      });
      callback(msgs);
    });

    return () => {
      unsubFirestore();
      if (broadcastChannel) broadcastChannel.close();
    };
  }

  return () => {
    if (broadcastChannel) broadcastChannel.close();
  };
}

// Emoji Reactions
export async function sendReaction(roomId: string, emoji: string, senderId: string, senderName: string): Promise<void> {
  const reaction: ReactionItem = {
    id: 'rx_' + Math.random().toString(36).substring(2, 9),
    emoji,
    senderId,
    senderName,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(`sabha_reactions_${roomId}`);
    channel.postMessage(reaction);
    channel.close();
  }

  if (isFirebaseConfigured() && db) {
    try {
      const reactionsCol = collection(db, `rooms/${roomId}/reactions`);
      await addDoc(reactionsCol, reaction);
    } catch (err) {
      console.warn('Error sending reaction:', err);
    }
  }
}

export function subscribeToReactions(
  roomId: string,
  callback: (reaction: ReactionItem) => void
): () => void {
  let broadcastChannel: BroadcastChannel | null = null;

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(`sabha_reactions_${roomId}`);
    broadcastChannel.onmessage = (event) => {
      callback(event.data);
    };
  }

  if (isFirebaseConfigured() && db) {
    const reactionsCol = collection(db, `rooms/${roomId}/reactions`);
    const q = query(reactionsCol, orderBy('timestamp', 'desc'), limit(10));

    let initialLoad = true;
    const unsubFirestore = onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback(change.doc.data() as ReactionItem);
        }
      });
    });

    return () => {
      unsubFirestore();
      if (broadcastChannel) broadcastChannel.close();
    };
  }

  return () => {
    if (broadcastChannel) broadcastChannel.close();
  };
}

// ----------------------------------------------------
// WAITING ROOM & KNOCKING SYSTEM
// ----------------------------------------------------

/**
 * Attendee requests to enter the waiting room (knocks)
 */
export async function requestToJoinWaitingRoom(
  roomId: string,
  participant: WaitingParticipant
): Promise<void> {
  // 1. BroadcastChannel notice
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`sabha_waiting_${roomId}`);
      channel.postMessage({ type: 'knock', participant });
      channel.close();
    } catch {}
  }

  // 2. Firestore document
  if (isFirebaseConfigured() && db) {
    try {
      const waitRef = doc(db, `rooms/${roomId}/waitingRoom/${participant.id}`);
      await setDoc(waitRef, participant);
    } catch (err) {
      console.warn('Error saving waiting room request to Firestore:', err);
    }
  }
}

/**
 * Attendee cancels their waiting request / leaves
 */
export async function leaveWaitingRoom(
  roomId: string,
  participantId: string
): Promise<void> {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`sabha_waiting_${roomId}`);
      channel.postMessage({ type: 'cancel', participantId });
      channel.close();
    } catch {}
  }

  if (isFirebaseConfigured() && db) {
    try {
      const waitRef = doc(db, `rooms/${roomId}/waitingRoom/${participantId}`);
      await deleteDoc(waitRef);
    } catch (err) {
      console.warn('Error deleting waiting room request:', err);
    }
  }
}

/**
 * Host subscribes to the waiting room roster in real time
 */
export function subscribeToWaitingRoom(
  roomId: string,
  callback: (waitingList: WaitingParticipant[]) => void
): () => void {
  let broadcastChannel: BroadcastChannel | null = null;
  let waitingMap = new Map<string, WaitingParticipant>();

  const emit = () => {
    const list = Array.from(waitingMap.values()).filter((p) => p.status === 'waiting');
    callback(list);
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(`sabha_waiting_${roomId}`);
    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === 'knock' && msg.participant) {
        waitingMap.set(msg.participant.id, msg.participant);
        emit();
      } else if (msg?.type === 'cancel' && msg.participantId) {
        waitingMap.delete(msg.participantId);
        emit();
      } else if ((msg?.type === 'admit' || msg?.type === 'deny') && msg.participantId) {
        waitingMap.delete(msg.participantId);
        emit();
      }
    };
  }

  if (isFirebaseConfigured() && db) {
    const waitCol = collection(db, `rooms/${roomId}/waitingRoom`);
    const unsub = onSnapshot(waitCol, (snapshot) => {
      const list: WaitingParticipant[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as WaitingParticipant;
        if (data && data.status === 'waiting') {
          list.push(data);
          waitingMap.set(data.id, data);
        } else {
          waitingMap.delete(d.id);
        }
      });
      callback(list);
    });

    return () => {
      unsub();
      if (broadcastChannel) broadcastChannel.close();
    };
  }

  return () => {
    if (broadcastChannel) broadcastChannel.close();
  };
}

/**
 * Attendee listens to their own admission status ('waiting' | 'admitted' | 'denied')
 */
export function subscribeToWaitingStatus(
  roomId: string,
  participantId: string,
  callback: (status: 'waiting' | 'admitted' | 'denied') => void
): () => void {
  let broadcastChannel: BroadcastChannel | null = null;

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(`sabha_waiting_${roomId}`);
    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg?.participantId === participantId) {
        if (msg.type === 'admit') callback('admitted');
        if (msg.type === 'deny') callback('denied');
      }
    };
  }

  if (isFirebaseConfigured() && db) {
    const waitRef = doc(db, `rooms/${roomId}/waitingRoom/${participantId}`);
    const unsub = onSnapshot(waitRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as WaitingParticipant;
        if (data?.status) {
          callback(data.status);
        }
      }
    });

    return () => {
      unsub();
      if (broadcastChannel) broadcastChannel.close();
    };
  }

  return () => {
    if (broadcastChannel) broadcastChannel.close();
  };
}

/**
 * Host admits a waiting participant
 */
export async function admitParticipant(
  roomId: string,
  participantId: string
): Promise<void> {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`sabha_waiting_${roomId}`);
      channel.postMessage({ type: 'admit', participantId });
      channel.close();
    } catch {}
  }

  if (isFirebaseConfigured() && db) {
    try {
      const waitRef = doc(db, `rooms/${roomId}/waitingRoom/${participantId}`);
      await updateDoc(waitRef, { status: 'admitted' });
    } catch (err) {
      console.warn('Error admitting participant:', err);
    }
  }
}

/**
 * Host admits all waiting participants at once
 */
export async function admitAllParticipants(
  roomId: string,
  participantIds: string[]
): Promise<void> {
  await Promise.all(participantIds.map((id) => admitParticipant(roomId, id)));
}

/**
 * Host denies a waiting participant
 */
export async function denyParticipant(
  roomId: string,
  participantId: string
): Promise<void> {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`sabha_waiting_${roomId}`);
      channel.postMessage({ type: 'deny', participantId });
      channel.close();
    } catch {}
  }

  if (isFirebaseConfigured() && db) {
    try {
      const waitRef = doc(db, `rooms/${roomId}/waitingRoom/${participantId}`);
      await updateDoc(waitRef, { status: 'denied' });
    } catch (err) {
      console.warn('Error denying participant:', err);
    }
  }
}

/**
 * Update host presence in the meeting
 */
export async function updateHostPresence(
  roomId: string,
  hostJoined: boolean
): Promise<void> {
  await updateRoomSettings(roomId, { hostJoined });
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`sabha_waiting_${roomId}`);
      channel.postMessage({ type: 'host-presence', hostJoined });
      channel.close();
    } catch {}
  }
}

/**
 * Update a participant's role (e.g. isCoHost) in Firestore
 */
export async function updateParticipantRole(
  roomId: string,
  participantId: string,
  updates: Partial<Participant>
): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const participantRef = doc(db, `rooms/${roomId}/participants/${participantId}`);
      await updateDoc(participantRef, updates);
    } catch (err) {
      console.warn('Error updating participant role in Firestore:', err);
    }
  }
}

