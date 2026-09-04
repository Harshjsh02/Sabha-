# Business Model & Cloud Cost Economics — Sabha (सभा)
**Document:** `docs/BUSINESS_MODEL.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. Zero-Cost Cloud Architecture (The $0 Operational Baseline)

Unlike traditional video conferencing startups that burn tens of thousands of dollars each month on dedicated media server clusters and cloud recording transcoders, Sabha is engineered to operate on a **100% Free-Tier Cloud Ecosystem**.

### Cost Comparison: 1,000 Meeting Hours / Month
| Cost Component | Commercial Platform (Zoom / Agora) | Self-Hosted Jitsi (VPS) | Sabha (सभा) |
| :--- | :--- | :--- | :--- |
| **Web Hosting & CDN** | Proprietary | $10–$25 / mo (Linode / DO) | **$0.00 / mo** (Vercel Hobby: 100GB/mo) |
| **Media Routing / SFU** | $0.004 / participant / min (~$240/mo)| $50–$120 / mo (c5.xlarge AWS) | **$0.00 / mo** (Mesh Fallback or LiveKit Free Cloud) |
| **Realtime Signaling DB**| Bundled | $15 / mo (Redis / Postgres) | **$0.00 / mo** (Firebase Spark Free: 50k reads/day) |
| **Cloud Recording** | $40–$100 / mo (S3 + Transcoding) | $30 / mo (Jibri EC2) | **$0.00 / mo** (In-Browser Client MediaRecorder) |
| **Total Monthly Cost** | **~$350 – $500 / month** | **~$105 – $190 / month** | **$0.00 / month** |

---

## 2. Monetization Pathways for Commercial Extension

While Sabha is open-source and natively free-tier compatible, organizations deploying Sabha can unlock multiple monetization strategies:

### 2.1 Enterprise Self-Hosted Licensing & White-Labeling
- **Target:** Universities, healthcare clinics (telehealth), legal firms, and corporate intranets requiring strict data residency compliance.
- **Offering:** Custom-branded meeting portal, SSO / SAML integration, on-premise LiveKit SFU deployment, and compliance audit logs.
- **Model:** Annual enterprise license ($1,500 – $10,000 / year).

### 2.2 Managed Cloud SaaS ("Sabha Cloud")
- **Freemium Tier:** 100% free forever for up to 10 participants in mesh mode or standard LiveKit cloud.
- **Sabha Pro ($6.99 / host / month — 50% cheaper than Zoom):**
  - Guaranteed 100+ participant SFU rooms.
  - Automatic cloud recording backup to AWS S3 / Google Drive in addition to local downloads.
  - Automated meeting transcription & AI summarization using Gemini Flash.
  - Custom branded subdomains (`meet.yourcompany.com`).

### 2.3 Educational & Community Sponsorships
- Open-source developer grants (GitHub Sponsors, Open Collective).
- University tech club sponsorships and community event partnerships.

---

## 3. Financial Sustainability & Breakeven Analysis

Because client-side peer connections handle encoding and in-browser recording eliminates server-side transcoding spikes:
- **Server Load:** Bound strictly to lightweight Next.js serverless functions (`/api/livekit-token`).
- **Cost Scaling:** Adding 1,000 users does not linearly scale cloud infrastructure costs.
- **Break-Even Point:** Under a SaaS model, as few as **10 paying Pro users ($70/month)** can offset high-tier cloud signaling and turn the platform profitable.
