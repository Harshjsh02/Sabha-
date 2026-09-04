# Security & Privacy Specification — Sabha (सभा)
**Document:** `docs/SECURITY.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. Security Architecture & Threat Model

Sabha is engineered with privacy-by-design principles to ensure that video, audio, text communication, and whiteboard collaboration remain completely confidential.

```
       [Client Browser] <==== DTLS-SRTP (Encrypted Media) ====> [Client Browser / SFU]
              |
              | (WSS / HTTPS TLS 1.3)
              v
       [Signaling Server: Firebase / LiveKit API]
```

### 1.1 Core Security Principles
1. **End-to-End Media Encryption:** All audio and video tracks flowing through WebRTC peer connections or LiveKit SFU endpoints are encrypted using standard **DTLS-SRTP** (Datagram Transport Layer Security / Secure Real-time Transport Protocol).
2. **Zero-Knowledge Cloud Recording:** Meeting recordings are captured client-side via the browser's native `MediaRecorder` API directly into local memory and saved to the user's hard drive. No audio or video data is uploaded to a remote recording server or third-party storage bucket.
3. **Least-Privilege Token Generation:** LiveKit access tokens are cryptographically signed server-side using the `LIVEKIT_API_SECRET`. Tokens are scoped strictly to the requested `roomId` and automatically expire after the session.
4. **Host Authority Enactment:** Administrative moderation actions (such as muting, kicking, and locking rooms) are verifiable and enforced across all client interfaces.

---

## 2. Threat Analysis & Mitigations

| Threat Vector | Potential Impact | Sabha Mitigation |
| :--- | :--- | :--- |
| **"Zoombombing" / Room Crashing** | Unauthorized trolls join public meeting links and disrupt calls. | **Room Lock:** Host can lock the room (`isLocked: true`).<br>**Host Kick:** Host can eject any disruptive user with instant peer connection destruction.<br>**Green Room:** Preview identity before granting entry. |
| **Eavesdropping / Wiretapping** | Intermediary network observer captures video/audio streams. | **DTLS-SRTP Encryption:** Mandatory across all WebRTC peer connections. Unencrypted RTP is rejected by browsers. |
| **Token Forgery** | Malicious client attempts to grant itself host or administrative privileges in SFU mode. | **Server-Side Token Minting:** Generated via private server environment variables (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) in Next.js Serverless Route. |
| **Cross-Room Data Leakage** | Participants in Room A read chat or signals from Room B. | **Scoped Firestore Collections:** All queries are strictly parameterized under `/rooms/{roomId}/*`. |
| **Microphone / Camera Hijacking** | Malicious scripts attempt background audio recording. | **Browser Permissions API:** Explicit browser prompts for hardware access; camera indicator light; visual mute badges in HUD. |

---

## 3. Environment Variables & Secret Hygiene

Sabha isolates sensitive credentials to server-side execution:

```env
# Client-Safe Environment Variables (Included in client bundle)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
NEXT_PUBLIC_LIVEKIT_URL=wss://app.livekit.cloud

# Strictly Server-Side Secrets (NEVER exposed to browser bundle)
LIVEKIT_API_KEY=APIn...
LIVEKIT_API_SECRET=sec_...
LIVEKIT_URL=wss://app.livekit.cloud
```

---

## 4. Compliance & Regulatory Alignment

- **GDPR & Privacy:** Zero persistent biometric storage. User display names and photos are sourced from the user's voluntary input or Google Profile and can be discarded upon room termination.
- **COPPA / Education Safe:** Guest mode allows students and participants to join assemblies without requiring persistent accounts, passwords, or data collection.
- **Local Data Sovereignty:** Because recordings are held on the user's local disk, meeting files are immediately compliant with corporate or regional data residency requirements.
