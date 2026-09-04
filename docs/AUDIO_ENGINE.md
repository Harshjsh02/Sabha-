# Audio Intelligence & Active Speaker Engine — Sabha (सभा)
**Document:** `docs/AUDIO_ENGINE.md`  
**Status:** Approved | **Version:** 1.0.0  

---

## 1. Overview

Sabha features an intelligent, client-side audio analysis engine implemented in [`lib/audio.ts`](file:///d:/projects/Sabha-/lib/audio.ts). It continuously samples microphone inputs and incoming peer audio streams to calculate real-time decibel energy, detect active speakers, and trigger visual speaker halos across the meeting room.

---

## 2. Audio Processing Pipeline

```
MediaStream (Audio Track)
        │
        ▼
AudioContext (Web Audio API)
        │
        ▼
MediaStreamAudioSourceNode
        │
        ▼
AnalyserNode (fftSize: 256, smoothingTimeConstant: 0.8)
        │
        ▼
Time-Domain Byte Frequency Extraction (Uint8Array)
        │
        ▼
Root Mean Square (RMS) Decibel Calculation
        │
        ▼
Hysteresis & Threshold Filter (> 28 dB for > 100ms)
        │
        ├─► True: Dispatch Active Speaker Event -> Emerald Glow Ring on Video Tile
        └─► False: Remove Glow Ring / Audio Meter Inactive
```

---

## 3. Mathematical Principles & Implementation

### 3.1 RMS Amplitude Calculation
For a buffer of length $N$ containing sampled audio frequencies:

$$RMS = \sqrt{\frac{1}{N} \sum_{i=0}^{N-1} x_i^2}$$

In decibels relative to full scale (dBFS):

$$\text{Decibels} = 20 \cdot \log_{10}(RMS)$$

### 3.2 Hysteresis Noise Gating
To prevent flickering between speaker highlights during natural pauses in speech or sudden background keyboard clicks:
- **Activation Threshold:** Requires volume to exceed $28\text{ dB}$ for at least 2 consecutive sample windows ($100\text{ ms}$).
- **Deactivation Hold:** Keeps the speaker halo illuminated for an extra $400\text{ ms}$ after audio drops below threshold, creating smooth visual transitions.

---

## 4. Green Room Microphone Visualizer

Inside [`GreenRoom.tsx`](file:///d:/projects/Sabha-/components/meeting/GreenRoom.tsx), the audio engine powers an interactive pre-meeting level meter:
- An animation frame loop queries `getAudioLevel(analyserNode)`.
- Returns an integer normalized between `0` and `100%`.
- The green progress bar dynamically indicates voice sensitivity, allowing participants to adjust microphone distance and input volume before joining the call.

---

## 5. Performance & Resource Impact

- **CPU Overhead:** Runs on the browser's hardware-accelerated Web Audio thread. Uses negligible CPU (<0.5% on modern processors).
- **Sampling Interval:** Uses `requestAnimationFrame` throttled to 50ms intervals.
- **Resource Cleanup:** All `AudioContext` and `AnalyserNode` instances are explicitly closed and released on component unmount to prevent memory leaks.
