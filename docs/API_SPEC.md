# API & Signaling Protocol Specification — Sabha (सभा)
**Document:** `docs/API_SPEC.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. REST / Serverless API Endpoints

### 1.1 Generate LiveKit Access Token
Generates a signed JSON Web Token (JWT) granting access to join a specified LiveKit meeting room with participant permissions.

- **Route:** `GET /api/livekit-token`
- **Location:** [`app/api/livekit-token/route.ts`](file:///d:/projects/Sabha-/app/api/livekit-token/route.ts)
- **Auth:** Public client endpoint; authenticated via server-side `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.

#### Query Parameters
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `room` | `string` | Yes | Unique Sabha room identifier | `sabha-room-402` |
| `username` | `string` | Yes | Participant identity / peer ID | `peer_9x8f2a` or `User Name` |
| `isHost` | `string` | No | Boolean string (`true`/`false`) granting room admin grants | `true` |

#### Responses
**200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "wss://sabha-meet.livekit.cloud"
}
```

**400 Bad Request**
```json
{
  "error": "Missing room or username"
}
```

**500 Internal Server Error**
```json
{
  "error": "LiveKit credentials are not configured in environment variables"
}
```

---

## 2. Real-Time Signaling & Firestore Data Schema

When falling back to P2P Mesh or synchronizing room state, Sabha uses Firestore document collections under the root path `/rooms/{roomId}`.

### 2.1 Room State Document
- **Path:** `/rooms/{roomId}`
- **Interface:** `RoomSettings` ([`lib/types.ts`](file:///d:/projects/Sabha-/lib/types.ts))

```typescript
{
  roomId: string;             // Unique room slug or uuid
  hostId: string;             // Participant ID of the room creator
  hostName: string;           // Display name of the host
  title: string;              // e.g. "Sabha Weekly Sync"
  isLocked: boolean;          // If true, new joiners are denied entry
  allowScreenShare: boolean;  // Host permission toggle for participants
  allowChat: boolean;         // Host permission toggle for participants
  allowUnmute: boolean;       // Host permission toggle for participants
  createdAt: number;          // Unix timestamp (ms)
  endedAt?: number;           // Unix timestamp if room closed
}
```

### 2.2 Participant Presence Document
- **Path:** `/rooms/{roomId}/participants/{peerId}`
- **Interface:** `Participant` ([`lib/types.ts`](file:///d:/projects/Sabha-/lib/types.ts))

```typescript
{
  id: string;                 // Client peer ID
  uid: string;                // User UID (Firebase Auth or guest ID)
  name: string;               // Display name
  photoURL?: string | null;   // Google profile avatar or null
  isHost: boolean;            // Whether user is room host (सभापति)
  audioEnabled: boolean;      // Mic muted/unmuted state
  videoEnabled: boolean;      // Camera enabled/disabled state
  screenSharing: boolean;     // Screen share status
  isHandRaised: boolean;      // Hand raise queue status
  isMutedByHost: boolean;     // Whether muted by host command
  joinedAt: number;           // Unix timestamp (ms)
}
```

### 2.3 Chat Messages Collection
- **Path:** `/rooms/{roomId}/messages/{messageId}`
- **Interface:** `ChatMessage` ([`lib/types.ts`](file:///d:/projects/Sabha-/lib/types.ts))

```typescript
{
  id: string;                 // Document ID
  senderId: string;           // Peer ID of the sender
  senderName: string;         // Display name of sender
  senderPhoto?: string | null;// Avatar image URL
  text: string;               // Message text content
  timestamp: number;          // Unix epoch timestamp (ms)
  isSystem?: boolean;         // System event notifications (e.g. joined/left)
  to?: string;                // 'everyone' or target peerId for private DM
}
```

### 2.4 Live Reaction Collection
- **Path:** `/rooms/{roomId}/reactions/{reactionId}`
- **Interface:** `ReactionItem` ([`lib/types.ts`](file:///d:/projects/Sabha-/lib/types.ts))

```typescript
{
  id: string;                 // Document ID
  emoji: string;              // Emoji character (e.g. "👍", "❤️", "🎉")
  senderId: string;           // Peer ID of sender
  senderName: string;         // Sender display name
  timestamp: number;          // Unix epoch timestamp
}
```

### 2.5 WebRTC Signaling Protocol
- **Path:** `/rooms/{roomId}/signals/{signalId}`
- **Interface:** `SignalData` ([`lib/types.ts`](file:///d:/projects/Sabha-/lib/types.ts))

Used for SDP offer/answer exchanges and host moderator signals when operating in Mesh mode:

```typescript
{
  from: string;               // Source peer ID
  to: string;                 // Target peer ID or 'broadcast'
  type: 'offer' | 'answer' | 'candidate' | 'mute-command' | 'kick-command';
  payload: any;               // RTCSessionDescriptionInit, RTCIceCandidateInit, etc.
  timestamp: number;          // Unix epoch timestamp
}
```

#### Signal Command Payloads
- **`mute-command`**: Instructs the target participant's client to disable local audio track (`stream.getAudioTracks()[0].enabled = false`) and update presence state.
- **`kick-command`**: Instructs the target participant's client to unmount WebRTC listeners, tear down streams, and navigate back to the home route (`/`).

---

## 3. Web BroadcastChannel Protocol (Local Multi-Tab)

When running multiple tabs on the same origin (such as during local development and testing):
- **Channel Name:** `sabha_room_${roomId}`
- **Payload Format:** Emits exact `SignalData` JSON frames directly over the browser's native `BroadcastChannel` API, bypassing Firestore round-trips for zero network overhead.
