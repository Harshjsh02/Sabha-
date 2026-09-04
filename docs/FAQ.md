# Frequently Asked Questions (FAQ) — Sabha (सभा)
**Document:** `docs/FAQ.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. General & Capabilities

### Q1: What does "Sabha" mean?
**A:** "सभा" (Sabha) is a Sanskrit word meaning *assembly, council, or congregation*. It signifies an open, democratic gathering where people meet to converse and collaborate freely.

### Q2: Is Sabha really 100% free to deploy and run?
**A:** Yes. Sabha is architected specifically around the free tiers of:
- **Vercel:** Hosting and serverless API execution (100GB monthly bandwidth, unlimited serverless invocations for personal/hobby projects).
- **Firebase Spark Plan:** Free Firestore database (50,000 reads and 20,000 writes/day) and Google Authentication.
- **Google STUN:** Public STUN servers for WebRTC NAT traversal at $0 cost.
- **Client Recording:** Media is encoded client-side via `MediaRecorder` API directly to your hard disk with zero cloud storage costs.

### Q3: How many participants can join a single Sabha room?
**A:** It depends on whether you have configured LiveKit Cloud SFU or are running in Mesh WebRTC mode:
- **With LiveKit Cloud (SFU Mode):** Supports **50 to 100+ participants** comfortably. LiveKit's free cloud plan includes 50GB/month of SFU bandwidth.
- **Without LiveKit (Mesh WebRTC Fallback):** Ideal for **4 to 6 people** in full HD video, or **8 to 10 people** in audio-first discussions.

---

## 2. Technical & Setup

### Q4: Do I need to install an app or extension to use Sabha?
**A:** No. Sabha runs 100% in any modern browser (Chrome, Edge, Safari, Firefox, Brave) on Windows, macOS, Linux, Android, and iOS. Zero downloads or installations required.

### Q5: How do I set up Firebase credentials?
**A:** You can either:
1. Create a `.env.local` file with the keys specified in [`.env.example`](file:///d:/projects/Sabha-/.env.example).
2. Or click the **Firebase Settings** gear icon in the navigation bar and paste your Firebase Web App configuration directly into the in-app modal.

### Q6: Can attendees join without a Google account?
**A:** Yes! Attendees can enter in **Guest Mode** by simply entering a display name in the Green Room before joining.

---

## 3. Features & Troubleshooting

### Q7: Where are my meeting recordings saved?
**A:** Meeting recordings are saved directly to your computer's **Downloads** folder as high-definition `.webm` video files as soon as you stop recording. They never touch a remote server, ensuring total privacy.

### Q8: What should I do if my camera or microphone fails to load?
**A:**
1. Check browser permission settings (click the padlock icon in your browser's URL address bar).
2. Ensure no other application (like Zoom or Teams) is currently locking the hardware device.
3. Refresh the Green Room page.

### Q9: Can the host mute or kick participants?
**A:** Yes. The room creator is designated as the **Host (सभापति)** and has access to **Mute All**, individual participant muting, participant ejection (kick), and room locking from the Security and Participants panels.
