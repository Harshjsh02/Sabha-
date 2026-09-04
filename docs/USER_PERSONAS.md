# User Personas & Audience Profiles — Sabha (सभा)
**Document:** `docs/USER_PERSONAS.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. Primary Persona: The Community Leader / Educator

### Profile: "Dr. Vikram Joshi" — Computer Science Professor & Club Mentor
- **Age:** 44
- **Location:** Pune, India
- **Context:** Hosts weekly 90-minute algorithmic workshops and open-source hackathons for 60+ university students.
- **Tech Fluency:** High.
- **Core Frustrations:**
  - Standard Zoom free plan cuts off at 40 minutes right during complex code walkthroughs.
  - University IT department takes weeks to approve software budgets for paid licenses.
  - Students struggle with large downloads on college Wi-Fi or low-spec Chromebooks.
- **Why Sabha Solves His Needs:**
  - **No 40-Minute Limit:** Zero artificial time throttles.
  - **Zero Install:** Students click a single link and enter via their browser instantly.
  - **Interactive Whiteboard:** Can draw data structures and export PNG diagrams directly to students.
  - **Moderator Controls:** Can mute all microphones during lectures and lock the room against intruders.

---

## 2. Secondary Persona: The Remote Startup Founder

### Profile: "Aisha Khan" — Co-Founder & CTO at FinTech Early-Stage
- **Age:** 29
- **Location:** Bengaluru & Remote Global Team
- **Context:** Conducts daily standups, architectural reviews, and investor pitch presentations.
- **Tech Fluency:** Expert.
- **Core Frustrations:**
  - High SaaS recurring costs ($150+/month across team for Zoom + recording addons).
  - Heavy desktop client apps eat CPU/RAM when running local Docker containers and IDEs.
  - Meeting recordings are locked behind expensive cloud storage paywalls.
- **Why Sabha Solves Her Needs:**
  - **100% Free Cloud Infrastructure:** Deployable directly to her own Vercel and Firebase accounts.
  - **Client-Side Meeting Recording:** Downloads `.webm` files directly to her machine for free, with zero cloud storage costs.
  - **Direct Private Messaging:** Allows discrete team communication during external partner calls.
  - **Active Speaker Halos:** Clear visual feedback on who is speaking during multi-party debates.

---

## 3. Tertiary Persona: The Low-Bandwidth Guest / Freelancer

### Profile: "Mateo Silva" — Freelance Frontend Developer
- **Age:** 23
- **Location:** Latin America / Emerging Market
- **Context:** Joins client sprint planning sessions on variable 4G mobile hotspot connections.
- **Tech Fluency:** Intermediate.
- **Core Frustrations:**
  - Heavy desktop conferencing suites lag, stutter, and fail to adapt to packet loss.
  - Complex enterprise login gates (SSO, mandatory accounts) slow down attendance.
- **Why Sabha Solves His Needs:**
  - **Guest Mode:** 1-click entry without creating an account or signing in.
  - **Green Room Lobby:** Can test his microphone levels and camera preview before joining the live session.
  - **Adaptive Streaming:** SFU Dynacast and mesh fallbacks preserve audio fidelity even during video fluctuations.

---

## 4. Persona Needs vs. Feature Mapping

| Persona | Priority Feature | Sabha Implementation |
| :--- | :--- | :--- |
| **Dr. Vikram (Educator)** | Whiteboard + Unlimited Time + Moderation | [`WhiteboardModal.tsx`](file:///d:/projects/Sabha-/components/meeting/WhiteboardModal.tsx) & [`HostControlModal.tsx`](file:///d:/projects/Sabha-/components/meeting/HostControlModal.tsx) |
| **Aisha (Startup CTO)** | Free In-Browser Recording + Screen Share | [`MeetingControls.tsx`](file:///d:/projects/Sabha-/components/meeting/MeetingControls.tsx) (`MediaRecorder`) |
| **Mateo (Guest Developer)** | Green Room Preview + Guest Auth | [`GreenRoom.tsx`](file:///d:/projects/Sabha-/components/meeting/GreenRoom.tsx) & [`authContext.tsx`](file:///d:/projects/Sabha-/lib/authContext.tsx) |
