# Sabha (सभा) — Immediate & Long-Term Roadmap (Todo)
**Document:** `todo.md`  
**Status:** Active | **Updated:** 2026-09-04  

---

## 🎯 Recently Completed
- [x] Complete enterprise-grade documentation suite (`docs/PRD.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, etc.).
- [x] Create comprehensive task breakdown (`tasks.md`) matching project architecture.
- [x] Add copy button with visual checkmark animation and clean meeting invite URL sharing (`/room/[roomId]`).
- [x] Implement Spotlight Presentation Stage in `VideoGrid.tsx` with high-fidelity `object-contain` video rendering.
- [x] Wire LiveKit SFU dedicated screen sharing routing (`onRemoteScreenStreamAdded` / `onRemoteScreenStreamRemoved`).
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
