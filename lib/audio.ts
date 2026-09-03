// Web Audio API helper for active speaker detection

export class AudioActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private onSpeakingChange: (isSpeaking: boolean, volume: number) => void;
  private threshold: number;
  private isCurrentlySpeaking: boolean = false;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(
    stream: MediaStream,
    onSpeakingChange: (isSpeaking: boolean, volume: number) => void,
    threshold: number = 15
  ) {
    this.onSpeakingChange = onSpeakingChange;
    this.threshold = threshold;
    this.init(stream);
  }

  private init(stream: MediaStream) {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > this.threshold) {
          if (!this.isCurrentlySpeaking) {
            this.isCurrentlySpeaking = true;
            this.onSpeakingChange(true, average);
          }
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else {
          if (this.isCurrentlySpeaking && !this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
              this.isCurrentlySpeaking = false;
              this.onSpeakingChange(false, 0);
              this.silenceTimer = null;
            }, 600); // 600ms hangover to prevent flickering
          }
        }

        this.animationFrameId = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.warn('AudioActivityDetector initialization error:', err);
    }
  }

  public updateStream(newStream: MediaStream) {
    this.destroy();
    this.init(newStream);
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.isCurrentlySpeaking = false;
  }
}
