# Sabha (सभा) — Immediate & Long-Term Roadmap (Todo)
**Document:** `todo.md`  
**Status:** Active | **Updated:** 2026-09-04  

---

## 🎯 High Priority (Current Sprint)
- [x] Complete enterprise-grade documentation suite (`docs/PRD.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, etc.).
- [x] Create comprehensive task breakdown (`tasks.md`) matching project architecture.
- [ ] Add end-to-end Cypress or Playwright tests simulating multi-peer video calls in headless Chrome.
- [ ] Add copy button with visual checkmark animation on meeting invite URL sharing.

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
