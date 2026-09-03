export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export interface Participant {
  id: string; // peerId or uid
  uid: string;
  name: string;
  photoURL?: string | null;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  isHandRaised: boolean;
  isMutedByHost: boolean;
  joinedAt: number;
}

export interface RoomSettings {
  roomId: string;
  hostId: string;
  hostName: string;
  title: string;
  isLocked: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowUnmute: boolean;
  createdAt: number;
  endedAt?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string | null;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  to?: string; // 'everyone' or specific participant id
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export interface SignalData {
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'candidate' | 'mute-command' | 'kick-command';
  payload: any;
  timestamp: number;
}
