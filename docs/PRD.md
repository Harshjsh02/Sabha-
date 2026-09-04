# Product Requirements Document (PRD) — Sabha (सभा)
**Document:** `docs/PRD.md`  
**Status:** Approved | **Version:** 1.0.0  
**Target Market:** Global Remote Teams, Communities, Education, Low-Bandwidth Regions, Emerging Markets

---

## 1. Executive Summary & Problem Statement

### 1.1 The High Cost & Friction of Modern Video Conferencing
Modern video collaboration tools (Zoom, Microsoft Teams, Google Meet, Webex) dominate remote collaboration but present severe friction points:
- **Steep Recurring Costs:** Zoom Pro starts at $13.33–$20/host/month. A 50-person educational non-profit, student club, or open-source community faces thousands of dollars annually in per-seat subscription overhead.
- **Artificial Limitations on Free Tiers:** Free plans are throttled with 40-minute hard cutoffs, degraded resolutions, disabled local/cloud recording, or restricted admin moderation.
- **Bloated Software Footprint:** Desktop client downloads (100MB+), background updater services, telemetry trackers, and high memory footprints deter quick ad-hoc meetings.
- **Bandwidth Fragility in Low-Connectivity Environments:** Heavy client software often degrades catastrophically in sub-optimal networks, lacking lean client-side fallbacks.

### 1.2 The Sabha (सभा) Proposition
**Sabha (सभा)**—derived from the Sanskrit word for *assembly, council, or congregation*—is a zero-cost, high-performance, browser-native video collaboration suite.
- **Dual-Tier Hybrid Topology:** Combines **LiveKit SFU (Selective Forwarding Unit)** for medium-to-large assemblies (50–100+ participants) with an autonomous **Full-Mesh P2P WebRTC fallback** (powered by Google Public STUN and Firebase Firestore signaling).
- **100% Free-Tier Cloud Deployability:** Engineered to run comfortably on Vercel Hobby ($0/mo) and Firebase Spark ($0/mo), with optional LiveKit Cloud Free Tier ($0/mo for 50GB/mo bandwidth).
- **Zoom Feature Parity:** Host controls (mute-all, individual mute, kick, lock), in-browser zero-cost recording via `MediaRecorder`, interactive collaborative whiteboard, public & private chat, active speaker audio halos, and animated reactions.

---

## 2. Market Research & Competitive Positioning

### 2.1 Competitive Landscape
```
                     HIGH HOST CONTROLS & PARITY
                                  ^
                                  |
                                  |         ★ Sabha (सभा)
                                  |           (Zero-Cost, Next.js 16,
                                  |            SFU + Mesh Hybrid, Free Tier)
                                  |
   HIGH CLOUD EXPENSE <-----------+-----------> ZERO RUNNING COST ($0)
   (Zoom, Webex, Meet)            |
                                  |         Jitsi Meet (Self-hosted
                                  |         requires dedicated VPS)
                                  |
                                  |   Daily.co / Agora (Cost per min)
                                  v
                      LOW HOST CONTROLS / BASIC
```

### 2.2 Differentiation Matrix
| Feature | Zoom (Free) | Google Meet (Free) | Jitsi Meet | Sabha (सभा) |
| :--- | :--- | :--- | :--- | :--- |
| **Meeting Time Limit** | 40 Minutes | 60 Minutes | Unlimited | **Unlimited ($0/mo)** |
| **Client Requirement** | Native App / Web | Web Browser | Web Browser | **100% Zero-Install Web** |
| **Server Cost** | Paid per host | Paid Workspace | $15–$50/mo VPS | **$0.00 (Serverless / Spark)** |
| **Meeting Recording** | Local Only (App) | Paid Workspace only | Dropbox / Jibri setup | **In-Browser MediaRecorder ($0)** |
| **Collaborative Whiteboard** | Limited Free | Jamboard (Deprecated)| External link | **Native HTML5 Canvas + PNG Export** |
| **Architecture** | Proprietary SFU | Proprietary SFU | Jitsi Videobridge (JVM)| **LiveKit Cloud SFU + WebRTC Mesh Fallback** |

---

## 3. User Personas

### Persona A: Academic Professor / Community Lead ("Aarav")
- **Profile:** Leads a 40-member college developer club and conducts weekend seminars.
- **Pain Points:** Zoom 40-minute limit breaks lecture flow; university budget does not cover paid Zoom licenses.
- **Goal:** Launch an instant room via link, verify audio/video in a green room lobby, lock room against trolls, and share whiteboard notes.

### Persona B: Remote Startup Team ("Elena")
- **Profile:** Distributed team across 3 countries needing daily standups and sprint retros.
- **Pain Points:** Heavy apps consume memory alongside IDEs and Docker containers; cloud recording incurs extra billing.
- **Goal:** Quick 1-click room creation, direct 1-on-1 private side-chats, seamless screen sharing with system audio, and free local meeting recording.

### Persona C: Low-Bandwidth Guest ("Rohan")
- **Profile:** Joins from a rural region or mobile hotspot with intermittent speeds.
- **Pain Points:** Complex login/SSO flows and heavy native desktop apps fail on low-spec hardware.
- **Goal:** Guest login (no password or app download needed), smooth audio prioritisation, and clear active speaker indication.

---

## 4. Product Requirements & Feature Specifications

### 4.1 Pre-Meeting: Green Room Lobby
- **FR-101 (Device Permissions):** Request camera/microphone permissions explicitly with graceful degradation and instructional error alerts if blocked.
- **FR-102 (Live Video Preview):** Mirrored real-time webcam preview prior to room connection.
- **FR-103 (Audio Visualizer):** Real-time decibel meter bar showing microphone sensitivity and input volume.
- **FR-104 (Identity Customization):** Allow display name entry for anonymous guests, pre-filling Google profile name for authenticated users.

### 4.2 Core Meeting Engine & Media Orchestration
- **FR-201 (Hybrid Connection Strategy):**
  1. Check for LiveKit Server availability via `/api/livekit-token`. If available, connect to LiveKit SFU.
  2. If LiveKit credentials are absent, automatically fall back to browser-to-browser WebRTC mesh using Firestore signaling and STUN servers.
  3. If multi-tab testing on the same machine, use `BroadcastChannel` for ultra-low latency signaling.
- **FR-202 (Adaptive Video Grid):** Automatically restructure grid tiles (1, 2, 3–4, 5–6, 7–12 participants) with CSS Grid `minmax` ensuring equal visual weight and spotlight for screenshares.
- **FR-203 (Active Speaker Detection):** Audio level sampling at 50ms intervals via `AudioContext` and `AnalyserNode`. Apply emerald glowing ring (`ring-2 ring-emerald-500`) around active speaker's video tile.
- **FR-204 (HD Screen Sharing):** Screen stream capture via `navigator.mediaDevices.getDisplayMedia` with system audio. Replace local video track or publish auxiliary track seamlessly.

### 4.3 Host (सभापति) Administration & Security
- **FR-301 (Mute All):** Host broadcasts global mute command; remote participants' audio tracks are muted instantly.
- **FR-302 (Individual Mute):** Host mutes specific noisy participant; UI alerts participant that host muted them.
- **FR-303 (Kick Participant):** Host issues disconnect signal; target client terminates peer connection and redirects to landing page.
- **FR-304 (Lock Sabha):** Prevents new joiners from entering the room after meeting begins.
- **FR-305 (Permission Toggles):** Host toggles dynamic room permissions: `allowScreenShare`, `allowChat`, `allowUnmute`.

### 4.4 Collaboration & Productivity
- **FR-401 (Zero-Cost Meeting Recording):** Uses `MediaRecorder` API to capture mixed streams or screen display into WebM blobs. Downloadable locally upon stopping recording with zero cloud storage costs.
- **FR-402 (Interactive Whiteboard):** Modal whiteboard featuring 8 preset colors, stroke size slider, eraser mode, clear canvas, and 1-click PNG image export.
- **FR-403 (In-Meeting Chat):** Real-time text chat with tabbed/dropdown recipient selector (Everyone vs. Specific Participant) and live unread message counter badge.
- **FR-404 (Reactions & Confetti):** Floating emoji reaction triggers (👍, ❤️, 👏, 😂, 🎉, 🚀) with optional full-screen celebratory canvas confetti.
- **FR-405 (Hand Raising):** Hand raise queue for orderly discussions with notification badges on participant tiles.

---

## 5. Non-Functional Requirements (NFRs)

- **Performance:** Sub-200ms audio/video latency in SFU mode; sub-100ms in local mesh mode.
- **Reliability:** Auto-reconnect handling on network stutter; graceful fallback to audio-only if video bandwidth drops below 150 kbps.
- **Security:** Firebase Security Rules preventing unauthorized writes to other participants' signal/chat channels. LiveKit token generation secured via server-side API secret.
- **Accessibility:** High-contrast dark mode HUD, keyboard navigable controls, visual indicators for mic mute status and active speaker states.
- **Cost Efficiency:** $0/month operational baseline for standard community scale.
