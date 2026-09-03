import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ChatMessage, ReactionItem, RoomSettings } from './types';

export async function getOrCreateRoom(
  roomId: string,
  hostId: string,
  hostName: string
): Promise<RoomSettings> {
  const defaultSettings: RoomSettings = {
    roomId,
    hostId,
    hostName,
    title: `Sabha Meeting ${roomId}`,
    isLocked: false,
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
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
