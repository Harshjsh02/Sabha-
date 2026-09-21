# Sabha (सभा) — Codebase Tree Structure
**File:** `docs/tree_structure.md`

This document outlines the complete directory and file structure of the **Sabha** repository, providing a brief explanation of what each file holds and its purpose in the architecture.

---

## Overview

```text
Sabha-
├── .env.example
├── AGENTS.md
├── next.config.ts
├── package.json
├── README.md
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── livekit-token/
│   │   └── room/
│   └── room/
│       └── [roomId]/
├── components/
│   └── meeting/
├── docs/
│   ├── KNOWN_ISSUES.md
│   ├── tree_structure.md
│   └── ...
├── lib/
│   ├── audio.ts
│   ├── firebase.ts
│   ├── livekitService.ts
│   ├── roomService.ts
│   └── webrtc.ts
└── public/
```

---

## Root Directory

Configuration, tooling, and metadata for the project.

- `.env.example` - Template for environment variables (Firebase, LiveKit).
- `.gitignore` - Specifies intentionally untracked files that Git should ignore.
- `AGENTS.md` - Master AI Pair Programming instructions combined with Next.js 16 rules.
- `eslint.config.mjs` - Configuration rules for ESLint to maintain code quality.
- `next.config.ts` - Configuration file for Next.js 16 App Router.
- `package.json` / `package-lock.json` - NPM dependencies and project metadata.
- `postcss.config.mjs` - Configuration for PostCSS, required to process Tailwind CSS v4.
- `README.md` - Main entry point documentation for developers and users.
- `tsconfig.json` - Configuration for TypeScript compiler options.

---

## `/app`
Next.js App Router directory. Handles routing, pages, and serverless API endpoints.

- `favicon.ico` - Website favicon icon.
- `globals.css` - Global CSS file containing Tailwind v4 imports and base styles.
- `layout.tsx` - Root layout wrapper for the Next.js application (HTML, Body, Context Providers).
- `page.tsx` - The main landing page `/` (Allows users to start or join a meeting).
- **/api** - Serverless API routes (Backend).
  - `/auth/record-login/route.ts` - Serverless endpoint to record user login IPs and details to Firestore for auditing.
  - `/livekit-token/route.ts` - Generates secure JWT tokens for LiveKit SFU access.
  - `/room/leave/route.ts` - Handles server-side room teardown and broadcast termination signals when a user leaves.
- **/room**
  - `/[roomId]/page.tsx` - Server component for the meeting room route (e.g., `/room/123`).
  - `/[roomId]/RoomClient.tsx` - Client component that wraps the `MeetingRoom` logic and handles the Green Room transition.

---

## `/components`
React components for the application interface and meeting features.

- `FirebaseSetupModal.tsx` - Modal to help users configure Firebase without manually editing `.env`.
- `Navbar.tsx` - Global navigation bar.
- **/meeting** - Core interactive meeting UI components.
  - `ChatPanel.tsx` - In-meeting chat sidebar supporting public and 1-on-1 private messaging.
  - `GreenRoom.tsx` - Pre-meeting lobby for hardware testing (camera/mic) and display name entry.
  - `HostControlModal.tsx` - Security settings for the host (lock room, mute all, require camera).
  - `LeaveMeetingModal.tsx` - Options dialog for "End Meeting for All" vs "Leave Meeting".
  - `MeetingControls.tsx` - Bottom control bar (Mute, Video, Share Screen, Chat, Leave).
  - `MeetingRoom.tsx` - The primary state container and orchestrator for an active meeting.
  - `ParticipantsPanel.tsx` - Sidebar listing users, showing active speakers, and hand-raise queues.
  - `ReactionsOverlay.tsx` - Renders floating emojis and confetti bursts over the video grid.
  - `RecordModal.tsx` - Configuration dialog for client-side `.webm` meeting recordings.
  - `ShareMeetingModal.tsx` - UI for sharing meeting invite URLs and WhatsApp integrations.
  - `VideoGrid.tsx` - Responsive flex/grid container dynamically sizing video tiles and the presentation spotlight.
  - `VideoTile.tsx` - Individual participant video tile with active speaker halos (emerald ring).
  - `WaitingRoom.tsx` - The lobby UI for attendees waiting for host admission.
  - `WaitingRoomBanner.tsx` - Host notification banner for admitting/denying users in the waiting room.
  - `WhiteboardModal.tsx` - Interactive, multi-user drawing canvas with PNG export capability.

---

## `/lib`
Core business logic, services, and utilities.

- `audio.ts` - Web Audio API wrappers for calculating decibel levels (RMS) and triggering active speaker halos.
- `authContext.tsx` - React Context provider for Firebase Google Authentication state.
- `firebase.ts` - Firebase initialization and exported instances (Auth, Firestore).
- `livekitService.ts` - Wrapper for the LiveKit Client SDK, handling SFU track subscriptions and publishing.
- `roomService.ts` - Firestore operations (creating rooms, joining, updating presence, and signaling).
- `types.ts` - Global TypeScript interfaces (SignalData, User, Participant states).
- `webrtc.ts` - Native Full-Mesh WebRTC logic (`RTCPeerConnection`, ICE candidates) used as a fallback if LiveKit is absent.

---

## `/docs`
Comprehensive project specifications, guides, and architectural documentation.

- `API_SPEC.md` - Details REST routes and Firestore signaling payload contracts.
- `AUDIO_ENGINE.md` - Documentation on the Web Audio API analysis and active speaker logic.
- `context.md` - Current development context, state management, and edge cases.
- `DATABASE.md` - Firebase Firestore ERD, rules, and collection schemas.
- `KNOWN_ISSUES.md` - Central ledger of bugs, dead code, and technical debt.
- `PITCH.md` - Vision and value proposition for communities and investors.
- `PRD.md` - Product Requirements Document outlining Zoom parity features and user stories.
- `product.md` - Master specification document summarizing the entire project.
- `SECURITY.md` - Threat models, DTLS-SRTP encryption, and Firestore security rules.
- `SYSTEM_ARCHITECTURE.md` - Client-server boundaries, SFU vs. Mesh topologies.
- `tasks.md` - Granular sprint-by-sprint development task tracking.
- `todo.md` - Immediate action items and upcoming roadmap features.
- `tree_structure.md` - This file.
- `USER_JOURNEY.md` - Interaction flows for Hosts and Attendees.

---

## `/public`
Static assets served directly by Next.js.

- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` - Static UI vector graphics used in landing pages.
