# Sabha (सभा) — Immediate & Long-Term Roadmap (Todo)
**Document:** `todo.md`  
**Status:** Active | **Updated:** 2026-09-04  

---

## 🎯 Recently Completed
- [x] Meeting Waiting Room & Knocking system (Zoom & Google Meet style): `WaitingRoom.tsx` lobby for attendees, real-time `WaitingRoomBanner.tsx` host notifications with `[Admit]`/`[Deny]`, `ParticipantsPanel` waiting roster with `[Admit all]`, and `HostControlModal` security toggle.
- [x] Zoom-style "End Meeting for All" vs "Leave Meeting" options modal (`LeaveMeetingModal.tsx`) with server-side room teardown (`/api/room/leave` + LiveKit `deleteRoom`) and broadcast termination signals.
- [x] Multi-source recording with microphone voice mixing via `AudioContext` and `RecordModal` options dialog.
- [x] Prominent floating "Close Board" button directly on canvas surface in `WhiteboardModal.tsx` and flexbox overflow fix.
- [x] Fixed screen sharing fallback in WebRTC Mesh mode (`navigator.mediaDevices.getDisplayMedia`) with browser `onended` track restoration.
- [x] Fixed zombie LiveKit ref bug: gated assignment and safely disconnected on 401 Unauthorized / errors to allow automatic WebRTC Mesh fallback.
- [x] Added bidirectional transceiver pre-negotiation (`audio` & `video` sendrecv) in `WebRTCManager` for instant 0ms camera/screen swapping via `replaceTrack`.
- [x] Fixed screen presentation spotlight in `VideoGrid.tsx` for both LiveKit SFU and WebRTC Mesh modes.
- [x] Responsive "Share Screen" button in `MeetingControls.tsx` for all screen dimensions.
- [x] Serverless departure beacon (`/api/room/leave`) and 15-second stale heartbeat pruning for tab/browser closes.
- [x] Complete enterprise-grade documentation suite (`docs/PRD.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, etc.).
- [x] Create comprehensive task breakdown (`tasks.md`) matching project architecture.
- [x] Add copy button with visual checkmark animation and clean meeting invite URL sharing (`/room/[roomId]`).
- [x] Implement Spotlight Presentation Stage in `VideoGrid.tsx` with high-fidelity `object-contain` video rendering.
- [x] Enforce mandatory Google authentication with locked display names and login IP auditing (`/api/auth/record-login`).
- [x] Resolve Android Brave / mobile hardware locks in `GreenRoom.tsx` and eliminate disruptive in-call `alert()` dialogs.
- [x] True Firestore database host verification (`room.hostId === user.uid`) replacing insecure query params.
- [x] Implement Whiteboard "Close Board" header action with peer synchronization.

---

## 🎯 High Priority (Current Sprint)
- [ ] Add end-to-end Cypress or Playwright tests simulating multi-peer video calls in headless Chrome.
- [ ] Add fallback audio chime when participants raise hand or enter the meeting room.

---

## 🚀 Upcoming Features (Next Release)
- [ ] **AI Meeting Summarizer:** Integrate Gemini 2.5/Flash API to auto-generate bulleted summaries from audio recordings.
- [ ] **Virtual Backgrounds & Blur:** Integrate `@mediapipe/selfie_segmentation` for client-side canvas blurring with zero cloud GPU requirement.
- [ ] **Breakout Rooms:** Allow the host to partition participants into secondary rooms and summon them back with a timer.
- [ ] **Noise Suppression:** Add Web Audio high-pass / low-pass filter chain to dampen background fan and keyboard noise.
- [ ] **Custom Polls & Quizzes:** Real-time in-meeting multiple-choice voting synchronized through Firestore.

---

## 🛠️ Performance & Tech Debt
- [ ] Optimize Tailwind CSS v4 production build size.
- [ ] Improve reconnect exponential backoff logic if user switches between Wi-Fi and mobile data during an active call.
- [ ] Add fallback audio chime when participants raise hand or enter the meeting room.
