# Implementation Task Breakdown & Sprint Plan — Sabha (सभा)
**Document:** `tasks.md`  
**Status:** In Progress / Maintenance | **Version:** 1.0.0  

---

## Sprint 1: Project Foundation, Core UI & Real-Time Engine (Completed)
- [x] **TASK-101:** Initialize Next.js 16 project structure with App Router, TypeScript, and Tailwind CSS v4.
- [x] **TASK-102:** Implement Firebase client initialization (`lib/firebase.ts`) supporting runtime environment variables and localStorage backup.
- [x] **TASK-103:** Create `authContext.tsx` supporting Firebase Google OAuth sign-in and guest profile generation.
- [x] **TASK-104:** Build responsive Landing Page (`app/page.tsx`) with room ID generator, join form, and feature showcases.
- [x] **TASK-105:** Implement Green Room lobby (`GreenRoom.tsx`) with real-time video preview and microphone audio visualizer.

---

## Sprint 2: Video Conferencing Engine & SFU/Mesh Hybrid (Completed)
- [x] **TASK-201:** Build `livekit-token` API route (`app/api/livekit-token/route.ts`) with HMAC-SHA256 token generation.
- [x] **TASK-202:** Implement `LiveKitRoomManager` (`lib/livekitService.ts`) for SFU track publishing, subscribing, and Dynacast.
- [x] **TASK-203:** Implement `WebRTCManager` (`lib/webrtc.ts`) as autonomous fallback using Google STUN and Firestore signaling.
- [x] **TASK-204:** Add `BroadcastChannel` signaling support for zero-network multi-tab local development.
- [x] **TASK-205:** Build `VideoGrid.tsx` and `VideoTile.tsx` with responsive layout calculation (1 to 12+ participants).

---

## Sprint 3: Collaboration & Moderation Features (Completed)
- [x] **TASK-301:** Implement Host Controls (`HostControlModal.tsx`): Mute All, Individual Mute, Kick, and Lock Room.
- [x] **TASK-302:** Build In-Meeting Chat (`ChatPanel.tsx`) with support for public broadcasts and 1-on-1 private DMs.
- [x] **TASK-303:** Implement interactive collaborative Whiteboard (`WhiteboardModal.tsx`) with color palette and PNG download.
- [x] **TASK-304:** Implement in-browser local meeting recording (`MeetingControls.tsx`) using native `MediaRecorder` API.
- [x] **TASK-305:** Implement floating emoji reactions (`ReactionsOverlay.tsx`) with canvas-confetti bursts.
- [x] **TASK-306:** Implement client-side active speaker detection engine (`lib/audio.ts`) with glowing emerald halos.

---

## Sprint 4: Architecture Documentation & Developer Ecosystem (Completed)
- [x] **TASK-401:** Benchmark documentation against reference standards (`Rhytam23/NYC`).
- [x] **TASK-402:** Create `docs/PRD.md` detailing problem space, personas, and feature specifications.
- [x] **TASK-403:** Create `docs/SYSTEM_ARCHITECTURE.md` with sequence and topology diagrams.
- [x] **TASK-404:** Create `docs/API_SPEC.md` documenting REST routes, Firestore schema, and signaling payloads.
- [x] **TASK-405:** Create `docs/DATABASE.md` detailing Firestore collections, ERD, and security rules.
- [x] **TASK-406:** Create `docs/SECURITY.md` covering DTLS-SRTP, zero-knowledge recording, and token hygiene.
- [x] **TASK-407:** Create `docs/USER_PERSONAS.md`, `docs/USER_JOURNEY.md`, `docs/BUSINESS_MODEL.md`, `docs/PITCH.md`, `docs/AUDIO_ENGINE.md`, `docs/FAQ.md`.
- [x] **TASK-408:** Create `tasks.md` and `todo.md` tracking project development status.

---

## Sprint 5: Auth Enforcement, Host Verification & Security Hardening (Completed)
- [x] **TASK-501:** Implement mandatory Google OAuth authentication before meeting entry; block unauthorized anonymous room joiners.
- [x] **TASK-502:** Lock participant display identity to verified Google profile name and photo; disable client-side name spoofing.
- [x] **TASK-503:** Build `/api/auth/record-login` endpoint to log participant login IP address, user agent, and timestamp to Firestore (`/users/{uid}/loginHistory`).
- [x] **TASK-504:** Implement database-level host verification (`room.hostId === user.uid`) replacing insecure client-side `?host=true` query parameters.
- [x] **TASK-505:** Create clean invite link architecture (`/room/[roomId]`) with dedicated `ShareMeetingModal` supporting Web Share API, WhatsApp, and copy-link animations.
- [x] **TASK-506:** Add host-enforced camera toggle (`requireVideo`), allowing the host to mandate all participants keep cameras active.
- [x] **TASK-507:** Add explicit "Close Board" header action to Whiteboard modal with live synchronization across peers.

---

## Sprint 6: LiveKit SFU Screen Sharing & Mobile Media Stability (Completed)
- [x] **TASK-601:** Implement dedicated LiveKit screen share track routing (`onRemoteScreenStreamAdded`, `onRemoteScreenStreamRemoved`, `onLocalScreenShareStopped`).
- [x] **TASK-602:** Build `ScreenPresentationStage` in `VideoGrid.tsx` with high-fidelity `object-contain` rendering, presenter badge, full-screen toggle, and local "Stop Sharing" button.
- [x] **TASK-603:** Implement participant filmstrip beneath presentation stage maintaining live video and audio activity indicators during screenshares.
- [x] **TASK-604:** Resolve mobile Android Brave hardware lock bug by releasing preview tracks in `GreenRoom.tsx` before room connection.
- [x] **TASK-605:** Implement publication-level `mute()` / `unmute()` in `LiveKitRoomManager` to prevent device re-acquisition failures and eliminate blocking browser `alert()` modals.
- [x] **TASK-606:** Add auto-cleanup listeners for screen share track `onended` events when participants stop sharing via browser system UI.

---

## Sprint 7: WebRTC Mesh Resilience, Zero-Lag Toggles & Screen Sharing (Completed)
- [x] **TASK-701:** Fix zombie LiveKit connection bug by strictly gating `liveKitManagerRef` assignment to successful connections and cleaning up on 401 Unauthorized / errors.
- [x] **TASK-702:** Implement native WebRTC Mesh screen sharing fallback via `navigator.mediaDevices.getDisplayMedia` with active camera stream preservation and clean browser `onended` track restoration.
- [x] **TASK-703:** Pre-allocate bidirectional audio and video transceivers (`sendrecv`) during `createPeerConnection` in `lib/webrtc.ts` to ensure video m-lines are negotiated upfront even if camera is initially off.
- [x] **TASK-704:** Enable seamless 0ms camera/screen swapping via `sender.replaceTrack(track)` matching across RTCRtpSenders and RTCRtpTransceivers.
- [x] **TASK-705:** Update `VideoGrid.tsx` to detect and spotlight remote screen presenters in both LiveKit SFU and WebRTC Mesh modes.
- [x] **TASK-706:** Refine `VideoTile.tsx` to cleanly toggle between avatar initials and active video stream without displaying blank/black video tiles.
- [x] **TASK-707:** Make Screen Share control button fully responsive and visible across all viewport dimensions in `MeetingControls.tsx`.
- [x] **TASK-708:** Wire up peer-to-peer Whiteboard stroke broadcasting in WebRTC Mesh mode (`manager.sendWhiteboardEvent` and `manager.onWhiteboardReceived`).
- [x] **TASK-709:** Implement `RecordModal.tsx` allowing participants to customize recording audio sources (microphone voice, system audio, and Sabha participants).
- [x] **TASK-710:** Implement multi-channel Web Audio API mixer (`AudioContext` + `createMediaStreamDestination`) to blend screen video with the presenter's microphone voice, computer audio, and remote peer speech into a synchronized WebM download.
- [x] **TASK-711:** Add prominent floating "Close Board" button directly on canvas surface in `WhiteboardModal.tsx` and fix flexbox viewport height constraints.
- [x] **TASK-712:** Implement Zoom-style Leave & End Meeting modal (`LeaveMeetingModal.tsx`) with Host options ("End Sabha for All" vs "Leave Sabha"), server-side room termination (`/api/room/leave` and LiveKit `deleteRoom`), attendee confirmation dialog, and graceful disconnection notifications.

---

## Sprint 8: Future Enhancements & Scalability (Roadmap)
- [ ] **TASK-801:** Implement virtual background blurring and custom image replacement via MediaPipe Selfie Segmentation.
- [ ] **TASK-802:** Add AI-powered automated live meeting transcription using Web Speech API or Gemini Flash.
- [ ] **TASK-803:** Implement Breakout Rooms feature with independent Firestore sub-channel rooms.
- [ ] **TASK-804:** Support mobile-responsive portrait HUD optimizations for smartphone browsers.
- [ ] **TASK-805:** Add end-of-meeting summary notes export (Markdown format).
