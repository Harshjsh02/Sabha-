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

### 1.2 Record User Login & IP Audit Endpoint
Logs participant login telemetry, public IP address, user agent, and timestamp to Firestore for compliance and forensic auditing.

- **Route:** `POST /api/auth/record-login`
- **Location:** [`app/api/auth/record-login/route.ts`](file:///app/api/auth/record-login/route.ts)
- **Auth:** Client authenticated via Google OAuth UID

#### Request Body
```json
{
  "uid": "google_user_uid_12345",
  "email": "user@example.com",
  "displayName": "Verified User",
  "photoURL": "https://lh3.googleusercontent.com/..."
}
```

#### Responses
**200 OK**
```json
{
  "success": true,
  "ip": "203.0.113.195",
  "timestamp": 1726615200000
}
```

---

## 2. Real-Time Signaling & Firestore Data Schema

When falling back to P2P Mesh or synchronizing room state, Sabha uses Firestore document collections under the root path `/rooms/{roomId}`.

### 2.1 Room State Document
- **Path:** `/rooms/{roomId}`
- **Interface:** `RoomSettings` ([`lib/types.ts`](file:///lib/types.ts))

```typescript
{
  roomId: string;             // Unique room slug or uuid
  hostId: string;             // Authenticated Google UID of the room creator
  hostName: string;           // Display name of the host
  title: string;              // e.g. "Sabha Weekly Sync"
  isLocked: boolean;          // If true, new joiners are denied entry
  requireVideo: boolean;      // If true, host mandates all webcams remain active
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

### 2.6 User Identity & Login History Schema
- **Path:** `/users/{uid}`
- **Subcollection:** `/users/{uid}/loginHistory/{loginId}`

```typescript
// /users/{uid} document
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastLoginAt: number;
  lastLoginIp: string;
}

// /users/{uid}/loginHistory/{loginId} document
{
  ip: string;
  userAgent: string;
  timestamp: number;
}
```

---

## 3. Web BroadcastChannel Protocol (Local Multi-Tab)

When running multiple tabs on the same origin (such as during local development and testing):
- **Channel Name:** `sabha_room_${roomId}`
- **Payload Format:** Emits exact `SignalData` JSON frames directly over the browser's native `BroadcastChannel` API, bypassing Firestore round-trips for zero network overhead.

---

## 4. LiveKit Real-Time DataChannel Protocol

When operating in LiveKit SFU mode, real-time collaboration messages (such as Whiteboard strokes) are transmitted using reliable binary DataChannels (`room.localParticipant.publishData`):

### 4.1 Whiteboard Stroke Event
```json
{
  "type": "whiteboard",
  "event": {
    "type": "draw",
    "x": 240,
    "y": 180,
    "prevX": 235,
    "prevY": 178,
    "color": "#10b981",
    "width": 3,
    "isErasing": false
  }
}
```

### 4.2 Whiteboard Clear Canvas Event
```json
{
  "type": "whiteboard",
  "event": {
    "type": "clear"
  }
}
```
