# Sabha (सभा) — Development Context
**File:** `context.md`  
**Status:** Active | **Phase:** Production Release & Architecture Documentation  
**Repository:** [Harshjsh02/Sabha-](https://github.com/Harshjsh02/Sabha-)  

---

## 1. Project Overview
- **Name:** Sabha (सभा)
- **Etymology:** Sanskrit for *assembly, council, or congregation*.
- **Tagline:** A high-performance, Zoom-like real-time video conferencing web application engineered to run entirely on **100% free-tier cloud resources** (Vercel + Firebase Spark + Peer-to-Peer WebRTC).
- **Core Technology Stack:**
  - **Framework:** Next.js 16 (App Router, TypeScript, React 19)
  - **Styling:** Tailwind CSS v4, Lucide Icons, Glassmorphism HUD
  - **Real-Time Signaling:** Firebase Firestore (or automatic local BroadcastChannel fallback)
  - **Authentication:** Firebase Google Authentication & Anonymous Guest Mode
  - **Media Engine:** Hybrid Architecture — LiveKit Cloud SFU (primary for 50–100+ seats) + Native WebRTC Mesh (fallback for 4–10 seats)
  - **In-Browser Recording:** Native `MediaRecorder` API ($0 cloud storage/transcoding cost)
  - **Audio Intelligence:** Web Audio API (`AudioContext`, `AnalyserNode`) for active speaker detection halos

---

## 2. Current Development Phase & Status

### Phase: Production Ready & Extended Documentation Suite
- **Branch:** `docs/comprehensive-documentation`
- **Codebase Integrity:** Working tree clean, Next.js 16 App Router routes verified.
- **Mobile Optimizations:** Viewport touch targets, orientation responsiveness, and iOS safe area padding handled.
- **Active Initiatives:**
  - Comprehensive documentation suite benchmarked against high-depth reference architectures.
  - Zero-cost architecture validation across Vercel Hobby + Firebase Spark.
  - Development context and product specification alignment for AI pair programming.

---

## 3. Core Architecture & Media Engine Flow

### 3.1 Dual-Tier Hybrid Media Pipeline

```
                              [Client joins /room/:roomId]
                                           │
                                           ▼
                             [Check LiveKit Server Status]
                                     /           \
                                    /             \
                      (LiveKit Available)    (LiveKit Missing / Fallback)
                                  /                 \
                                 v                   v
                    ┌─────────────────────────┐  ┌─────────────────────────┐
                    │  LiveKit SFU Mode       │  │  WebRTC Mesh Mode       │
                    │  - Ingest 1 stream/user │  │  - N*(N-1)/2 connections│
                    │  - Fan-out to all peers │  │  - Google Public STUN   │
                    │  - Dynacast & Adaptive  │  │  - Firestore Signaling  │
                    │  - 50 to 100+ users     │  │  - 4 to 10 users        │
                    └─────────────────────────┘  └─────────────────────────┘
```

### 3.2 Real-Time Signaling & Multi-Tab Testing
- **Production Mode:** Relies on Firestore sub-collections (`/rooms/{roomId}/signals`, `/messages`, `/reactions`, `/participants`).
- **Local Testing Mode:** Automatically initializes a `BroadcastChannel('sabha_room_' + roomId)` when opening multiple tabs on `localhost:3000`. Signaling messages are delivered instantaneously across browser tabs with zero network round-trip.

---

## 4. State Management & Key Modules

| Module / Component | Path | Responsibility |
| :--- | :--- | :--- |
| **Meeting Orchestrator** | `components/meeting/MeetingRoom.tsx` | Manages local/remote streams, audio analyser, active modal state, recording, duration timer. |
| **Green Room Lobby** | `components/meeting/GreenRoom.tsx` | Pre-meeting webcam preview, permission gates, microphone visualizer bar. |
| **LiveKit Room Manager**| `lib/livekitService.ts` | Handles SFU connections, remote track subscription events, dynacast, and server disconnects. |
| **WebRTC Mesh Manager** | `lib/webrtc.ts` | Native peer connection lifecycle, polite-peer SDP offer/answer collision resolution, ICE candidate exchange. |
| **Audio Analyser** | `lib/audio.ts` | FFT frequency analysis, RMS decibel calculation, active speaker detection with glowing emerald halo. |
| **Interactive Whiteboard**| `components/meeting/WhiteboardModal.tsx`| HTML5 canvas whiteboard with stroke colors, widths, eraser, and PNG export. |
| **Host Moderation** | `components/meeting/HostControlModal.tsx`| Mute All, Kick disruptive peers, Lock Sabha, and toggle permission rights. |
| **In-Meeting Chat** | `components/meeting/ChatPanel.tsx` | Broadcast messages & 1-on-1 direct private messages with unread counters. |
| **Auth Provider** | `lib/authContext.tsx` | Firebase Auth listener, Google sign-in popup, guest user profile fallback. |

---

## 5. Design System & HUD Aesthetics

- **Theme:** Ultra-sleek dark mode (`#0B0F17`, `#111827`, `#1F2937`) with frosted glassmorphism overlays (`backdrop-blur-md bg-slate-900/80`).
- **Accent Palette:**
  - **Emerald Green (`#10B981`):** Active speaker audio glow ring, connected status indicators.
  - **Violet / Indigo (`#6366F1` / `#8B5CF6`):** Primary actions, host badges, brand highlights.
  - **Rose / Red (`#EF4444`):** Recording pulse dot, microphone muted badges, end call action.
  - **Amber / Yellow (`#F59E0B`):** Hand raise queue indicator, warning notices.
- **Iconography:** Lucide Icons (`lucide-react`).
- **Typography:** Modern sans-serif system stack optimized for cross-platform legibility.

---

## 6. Environment Configuration

```env
# Firebase Free Spark Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...

# Optional LiveKit Cloud SFU (Free 50GB Tier)
LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

---

## 7. Known Edge Cases & Architectural Handling

1. **Host Departure:** If the host leaves, the meeting continues for remaining participants, but administrative permissions are locked unless passed to a co-host.
2. **Permission Denial in Green Room:** When webcam or microphone access is blocked by browser policy, the Green Room displays instructional recovery prompts and allows entering muted.
3. **Bandwidth Degrades (Mesh Mode):** High CPU/network congestion triggers automatic video degradation to preserve pristine stereo audio.
4. **Recording Tab Switching:** The `MediaRecorder` captures system display or window audio; user can minimize the browser window while recording remains active.
