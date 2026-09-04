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

## Sprint 4: Architecture Documentation & Developer Ecosystem (Current)
- [x] **TASK-401:** Benchmark documentation against reference standards (`Rhytam23/NYC`).
- [x] **TASK-402:** Create `docs/PRD.md` detailing problem space, personas, and feature specifications.
- [x] **TASK-403:** Create `docs/SYSTEM_ARCHITECTURE.md` with sequence and topology diagrams.
- [x] **TASK-404:** Create `docs/API_SPEC.md` documenting REST routes, Firestore schema, and signaling payloads.
- [x] **TASK-405:** Create `docs/DATABASE.md` detailing Firestore collections, ERD, and security rules.
- [x] **TASK-406:** Create `docs/SECURITY.md` covering DTLS-SRTP, zero-knowledge recording, and token hygiene.
- [x] **TASK-407:** Create `docs/USER_PERSONAS.md`, `docs/USER_JOURNEY.md`, `docs/BUSINESS_MODEL.md`, `docs/PITCH.md`, `docs/AUDIO_ENGINE.md`, `docs/FAQ.md`.
- [x] **TASK-408:** Create `tasks.md` and `todo.md` tracking project development status.

---

## Sprint 5: Future Enhancements & Scalability (Roadmap)
- [ ] **TASK-501:** Implement virtual background blurring and custom image replacement via MediaPipe Selfie Segmentation.
- [ ] **TASK-502:** Add AI-powered automated live meeting transcription using Web Speech API or Gemini Flash.
- [ ] **TASK-503:** Implement Breakout Rooms feature with independent Firestore sub-channel rooms.
- [ ] **TASK-504:** Support mobile-responsive portrait HUD optimizations for smartphone browsers.
- [ ] **TASK-505:** Add end-of-meeting summary notes export (Markdown format).
