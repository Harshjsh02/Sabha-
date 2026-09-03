# Sabha (सभा) 🎙️📹

> **सभा (Sabha)** is a Sanskrit word meaning *assembly, council, or congregation*.  
> A high-performance, Zoom-like real-time video conferencing web application engineered to run entirely on **100% free-tier cloud resources** (Vercel + Firebase Spark + Peer-to-Peer WebRTC).

---

## 🚀 Features (Zoom Parity)

- 🔒 **Google Authentication & Guest Mode**: Instant 1-click login with Google or join with custom display name.
- 👑 **Host (सभापति) Admin Controls**:
  - **Mute All**: Instantly mute every participant's microphone.
  - **Individual Mute**: Mute any noisy participant.
  - **Kick Participant**: Remove disruptive users from the room.
  - **Lock Sabha**: Lock room to prevent unauthorized new entries.
  - **Security Permissions**: Toggle participant rights to screen share, chat, or unmute.
- 💻 **HD Screen Sharing**: Share application windows, browser tabs, or whole screens with system audio.
- 💬 **In-Meeting Chat**: Public messages to everyone or direct 1-on-1 private messages with live unread indicators.
- 🎨 **Interactive Sabha Whiteboard**: Brainstorm together with multi-color drawing canvas, stroke controls, and 1-click PNG image export.
- ⏺️ **In-Browser Meeting Recording**: Record video & audio directly via the browser's `MediaRecorder` API into downloadable `.webm` files with **$0 cloud recording fees**.
- ✋ **Hand Raising & Reactions**: Raise hand queue for orderly assemblies + floating emoji reactions (👍, ❤️, 👏, 😂, 🎉, 🚀) with celebratory confetti.
- 🎙️ **Active Speaker Detection**: Glowing emerald audio halo around whoever is actively speaking using Web Audio API frequency analysis.
- 🚪 **Green Room Lobby**: Pre-meeting preview of your webcam and live audio visualizer before stepping into the meeting.

---

## 📊 Capacity & Architecture: How Many People Can Sabha Handle for Free?

### Real-Time Media Architecture
Sabha uses a **Full-Mesh WebRTC Topology** paired with Google's free public STUN servers and Firebase Firestore for real-time signaling. Media streams flow directly browser-to-browser without passing through expensive intermediary media servers.

| Mode | Capacity | Description |
| :--- | :--- | :--- |
| **Optimal HD Meeting** | **4 to 6 people** | Crystal clear 720p/1080p video & stereo audio on standard laptops and broadband. |
| **Playable Group Discussion** | **8 to 10 people** | Audio-first meetings or meetings where non-speakers turn off video. |
| **Concurrent Meetings Across App** | **Thousands / day** | Firebase Firestore Free Spark Plan provides **50,000 document reads/day** and **20,000 writes/day**, and Vercel provides **100 GB free bandwidth/month**. |

---

## 🛠️ Tech Stack & Zero-Cost Infrastructure

- **Frontend & Routing**: Next.js 16 (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS v4 + Lucide Icons + Glassmorphism HUD
- **Real-Time Signaling**: Firebase Firestore (or automatic local BroadcastChannel fallback)
- **Authentication**: Firebase Google Authentication
- **Media Engine**: Native WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`, `Web Audio API`)
- **Hosting**: Vercel (Hobby Tier: $0.00 / month forever)
- **Database**: Firebase (Spark Tier: $0.00 / month forever)

---

## ⚡ Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Harshjsh02/Sabha-.git
cd Sabha-
npm install
```

### 2. Configure Firebase (Free Spark Plan)
Create a `.env.local` file or configure via the in-app **Firebase Settings** modal:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
```

> **Steps in Firebase Console:**
> 1. Visit [Firebase Console](https://console.firebase.google.com) and create a free project.
> 2. Enable **Authentication** > Sign-in method > **Google**.
> 3. Create a **Firestore Database** in test mode.
> 4. Go to **Project Settings** > General > Add Web App (`</>`) and copy your keys.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your Sabha instance.

---

## 🌐 Deploying to Vercel in 60 Seconds

1. Push your code to your GitHub repository (`https://github.com/Harshjsh02/Sabha-.git`).
2. Go to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Add the `NEXT_PUBLIC_FIREBASE_*` environment variables in the Vercel dashboard.
5. Click **Deploy**! Your Sabha meeting app is live with SSL, global CDN, and $0 running costs.
