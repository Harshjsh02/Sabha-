import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  LocalTrackPublication,
  LocalParticipant,
  DisconnectReason,
} from 'livekit-client';
import { Participant } from './types';

export class LiveKitRoomManager {
  private room: Room;
  private wsUrl: string;
  private token: string;
  private localParticipantInfo: Participant;

  public onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteStreamRemoved: (peerId: string) => void = () => {};
  public onRemoteScreenStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteScreenStreamRemoved: (peerId: string) => void = () => {};
  public onLocalScreenShareStopped: () => void = () => {};
  public onParticipantsChanged: (participants: Participant[]) => void = () => {};
  public onActiveSpeakersChanged: (speakerIds: string[]) => void = () => {};
  public onDataReceived: (payload: any, peerId: string) => void = () => {};
  public onKicked: (reason?: string) => void = () => {};
  public onLocalStreamChanged: (stream: MediaStream) => void = () => {};

  private remoteMediaStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();
  private localMediaStream: MediaStream = new MediaStream();
  private participantStateOverrides: Map<string, Partial<Participant>> = new Map();

  constructor(wsUrl: string, token: string, localParticipantInfo: Participant) {
    this.wsUrl = (wsUrl || '').trim();
    this.token = (token || '').trim();
    this.localParticipantInfo = localParticipantInfo;

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    this.setupListeners();
  }

  private setupListeners() {
    // Track subscribed
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const peerId = participant.identity;

        // Auto-play audio tracks reliably via hidden audio element
        if (track.kind === Track.Kind.Audio) {
          try {
            const audioEl = track.attach();
            audioEl.style.display = 'none';
            audioEl.id = `lk_audio_${peerId}_${track.sid}`;
            document.body.appendChild(audioEl);
          } catch (e) {
            console.warn('Audio track attach notice:', e);
          }
        }

        // Route screen share to dedicated presentation stream
        if (publication.source === Track.Source.ScreenShare) {
          const screenStream = new MediaStream([track.mediaStreamTrack]);
          this.remoteScreenStreams.set(peerId, screenStream);
          this.onRemoteScreenStreamAdded(peerId, screenStream);
          this.syncParticipants();
          return;
        }

        let stream = this.remoteMediaStreams.get(peerId);
        if (!stream) {
          stream = new MediaStream();
          this.remoteMediaStreams.set(peerId, stream);
        }

        if (!stream.getTracks().some((t) => t.id === track.mediaStreamTrack.id)) {
          stream.addTrack(track.mediaStreamTrack);
        }
        // Emit a fresh MediaStream reference so React state updates trigger immediately
        this.onRemoteStreamAdded(peerId, new MediaStream(stream.getTracks()));
        this.syncParticipants();
      }
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const peerId = participant.identity;

        if (track.kind === Track.Kind.Audio) {
          try {
            track.detach().forEach((el) => el.remove());
          } catch {}
        }

        if (publication.source === Track.Source.ScreenShare) {
          this.remoteScreenStreams.delete(peerId);
          this.onRemoteScreenStreamRemoved(peerId);
          this.syncParticipants();
          return;
        }

        const stream = this.remoteMediaStreams.get(peerId);
        if (stream) {
          stream.removeTrack(track.mediaStreamTrack);
          if (stream.getTracks().length === 0) {
            this.remoteMediaStreams.delete(peerId);
            this.onRemoteStreamRemoved(peerId);
          } else {
            this.onRemoteStreamAdded(peerId, new MediaStream(stream.getTracks()));
          }
        }
        this.syncParticipants();
      }
    );

    // Track Muted / Unmuted (syncs remote indicators and local stream)
    this.room.on(RoomEvent.TrackMuted, (_pub, participant) => {
      if (participant === this.room.localParticipant) {
        this.onLocalStreamChanged(this.getLocalStream());
      } else {
        this.syncParticipants();
      }
    });

    this.room.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
      if (participant === this.room.localParticipant) {
        this.onLocalStreamChanged(this.getLocalStream());
      } else {
        this.syncParticipants();
      }
    });

    // Local track published / unpublished
    this.room.on(RoomEvent.LocalTrackPublished, () => {
      this.onLocalStreamChanged(this.getLocalStream());
    });

    this.room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      this.onLocalStreamChanged(this.getLocalStream());
      if (pub.source === Track.Source.ScreenShare) {
        this.onLocalScreenShareStopped();
      }
    });

    // Participant connected / disconnected
    this.room.on(RoomEvent.ParticipantConnected, () => {
      this.syncParticipants();
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      const peerId = participant.identity;
      this.remoteMediaStreams.delete(peerId);
      this.remoteScreenStreams.delete(peerId);
      this.onRemoteStreamRemoved(peerId);
      this.onRemoteScreenStreamRemoved(peerId);
      this.syncParticipants();
    });

    // Participant metadata changed (e.g. photoURL updated)
    this.room.on(RoomEvent.ParticipantMetadataChanged, () => {
      this.syncParticipants();
    });

    // Active speakers changed
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = speakers.map((s) => s.identity);
      this.onActiveSpeakersChanged(ids);
    });

    // Real-time DataChannel (Whiteboard, gestures, sync)
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const decoder = new TextDecoder();
        const str = decoder.decode(payload);
        const data = JSON.parse(str);
        if (data.type === 'kick-command' || data.type === 'end-meeting') {
          const reason = data.payload?.reason || (data.type === 'end-meeting' ? 'meeting-ended' : 'kicked');
          this.onKicked(reason);
          return;
        }
        if (data.type === 'participant-state-update' && data.participantId) {
          const current = this.participantStateOverrides.get(data.participantId) || {};
          this.participantStateOverrides.set(data.participantId, { ...current, ...data.updates });
          this.syncParticipants();
          return;
        }
        this.onDataReceived(data, participant?.identity || '');
      } catch (err) {
        console.warn('Failed to parse received data packet:', err);
      }
    });

    // Room disconnected
    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      this.remoteMediaStreams.clear();
      if (reason === DisconnectReason.ROOM_DELETED) {
        this.onKicked('meeting-ended');
      } else if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        this.onKicked('kicked');
      }
    });
  }

  public async connect(): Promise<void> {
    await this.room.connect(this.wsUrl, this.token);
    if (this.room.localParticipant) {
      try {
        await this.room.localParticipant.setMetadata(
          JSON.stringify({
            photoURL: this.localParticipantInfo.photoURL || null,
            uid: this.localParticipantInfo.uid,
          })
        );
      } catch {}
    }
    this.syncParticipants();
  }

  public async publishLocalTracks(
    audioEnabled: boolean,
    videoEnabled: boolean,
    existingStream?: MediaStream | null
  ): Promise<MediaStream> {
    try {
      // 1. If an existing stream was passed from GreenRoom, publish its tracks directly
      if (existingStream && existingStream.getTracks().length > 0) {
        const videoTrack = existingStream.getVideoTracks()[0];
        const audioTrack = existingStream.getAudioTracks()[0];

        if (videoTrack) {
          videoTrack.enabled = videoEnabled;
          const pub = await this.room.localParticipant.publishTrack(videoTrack, {
            name: 'camera',
            source: Track.Source.Camera,
          });
          if (!videoEnabled) {
            await pub.mute();
          }
          if (!this.localMediaStream.getTracks().some((t) => t.id === videoTrack.id)) {
            this.localMediaStream.addTrack(videoTrack);
          }
        }

        if (audioTrack) {
          audioTrack.enabled = audioEnabled;
          const pub = await this.room.localParticipant.publishTrack(audioTrack, {
            name: 'microphone',
            source: Track.Source.Microphone,
          });
          if (!audioEnabled) {
            await pub.mute();
          }
          if (!this.localMediaStream.getTracks().some((t) => t.id === audioTrack.id)) {
            this.localMediaStream.addTrack(audioTrack);
          }
        }

        return new MediaStream(this.localMediaStream.getTracks());
      }

      // 2. Otherwise request tracks via LiveKit defaults
      if (videoEnabled) {
        const camPub = await this.room.localParticipant.setCameraEnabled(true);
        if (camPub?.track?.mediaStreamTrack) {
          this.localMediaStream.addTrack(camPub.track.mediaStreamTrack);
        }
      }
      if (audioEnabled) {
        const micPub = await this.room.localParticipant.setMicrophoneEnabled(true);
        if (micPub?.track?.mediaStreamTrack) {
          this.localMediaStream.addTrack(micPub.track.mediaStreamTrack);
        }
      }
    } catch (err) {
      console.warn('Initial track publication warning:', err);
    }

    return this.getLocalStream();
  }

  public getLocalStream(): MediaStream {
    const localStream = new MediaStream();
    this.room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track?.mediaStreamTrack && pub.source !== Track.Source.ScreenShare) {
        if (!localStream.getTracks().some((t) => t.id === pub.track!.mediaStreamTrack.id)) {
          localStream.addTrack(pub.track.mediaStreamTrack);
        }
      }
    });

    this.localMediaStream.getTracks().forEach((t) => {
      if (t.readyState === 'live' && !localStream.getTracks().some((existing) => existing.id === t.id)) {
        localStream.addTrack(t);
      }
    });

    return localStream;
  }

  public async setAudioEnabled(enabled: boolean): Promise<MediaStream> {
    try {
      const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPub && micPub.track) {
        // Fast path: instant 0ms mute/unmute without re-initializing hardware
        if (enabled) {
          await micPub.unmute();
        } else {
          await micPub.mute();
        }
        if (micPub.track.mediaStreamTrack) {
          micPub.track.mediaStreamTrack.enabled = enabled;
        }
      } else {
        // Slow path: track not yet published
        const pub = await this.room.localParticipant.setMicrophoneEnabled(enabled);
        if (pub?.track?.mediaStreamTrack) {
          pub.track.mediaStreamTrack.enabled = enabled;
          if (!this.localMediaStream.getTracks().some((t) => t.id === pub.track!.mediaStreamTrack.id)) {
            this.localMediaStream.addTrack(pub.track.mediaStreamTrack);
          }
        }
      }

      this.sendData({
        type: 'participant-state-update',
        participantId: this.localParticipantInfo.id,
        updates: { audioEnabled: enabled },
      });
    } catch (err) {
      console.warn('Microphone toggle warning:', err);
    }

    const stream = this.getLocalStream();
    stream.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
    return stream;
  }

  public async setVideoEnabled(enabled: boolean): Promise<MediaStream> {
    try {
      const camPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub && camPub.track) {
        // Fast path: instant 0ms mute/unmute without re-initializing camera sensor
        if (enabled) {
          await camPub.unmute();
        } else {
          await camPub.mute();
        }
        if (camPub.track.mediaStreamTrack) {
          camPub.track.mediaStreamTrack.enabled = enabled;
        }
      } else {
        // Slow path: track not yet published
        const pub = await this.room.localParticipant.setCameraEnabled(enabled);
        if (pub?.track?.mediaStreamTrack) {
          pub.track.mediaStreamTrack.enabled = enabled;
          if (!this.localMediaStream.getTracks().some((t) => t.id === pub.track!.mediaStreamTrack.id)) {
            this.localMediaStream.addTrack(pub.track.mediaStreamTrack);
          }
        }
      }

      this.sendData({
        type: 'participant-state-update',
        participantId: this.localParticipantInfo.id,
        updates: { videoEnabled: enabled },
      });
    } catch (err) {
      console.warn('Camera toggle warning:', err);
    }

    const stream = this.getLocalStream();
    stream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    return stream;
  }

  public async setScreenShareEnabled(enabled: boolean): Promise<MediaStream | null> {
    try {
      const pub = await this.room.localParticipant.setScreenShareEnabled(enabled, {
        audio: true,
        selfBrowserSurface: 'include',
      });

      if (enabled && pub?.track?.mediaStreamTrack) {
        const stream = new MediaStream([pub.track.mediaStreamTrack]);
        return stream;
      }
      return null;
    } catch (err) {
      console.warn('LiveKit screen share toggle error/cancel:', err);
      return null;
    }
  }


  public async sendData(payload: any): Promise<void> {
    try {
      const str = JSON.stringify(payload);
      const encoder = new TextEncoder();
      await this.room.localParticipant.publishData(encoder.encode(str), { reliable: true });
    } catch (err) {
      console.warn('Failed to publish data message in LiveKit:', err);
    }
  }

  private syncParticipants() {
    const list: Participant[] = [];

    // Add remote participants
    this.room.remoteParticipants.forEach((rp) => {
      let photoURL: string | null = null;
      if (rp.metadata) {
        try {
          const meta = JSON.parse(rp.metadata);
          if (meta?.photoURL) photoURL = meta.photoURL;
        } catch {}
      }

      const camPub = rp.getTrackPublication(Track.Source.Camera);
      const isCamMuted = camPub ? camPub.isMuted : true;
      const calculatedHasVideo = Boolean(rp.isCameraEnabled && !isCamMuted);

      const micPub = rp.getTrackPublication(Track.Source.Microphone);
      const isMicMuted = micPub ? micPub.isMuted : true;
      const calculatedHasAudio = Boolean(rp.isMicrophoneEnabled && !isMicMuted);

      const override = this.participantStateOverrides.get(rp.identity);
      const hasVideo = override?.videoEnabled !== undefined ? override.videoEnabled : calculatedHasVideo;
      const hasAudio = override?.audioEnabled !== undefined ? override.audioEnabled : calculatedHasAudio;

      list.push({
        id: rp.identity,
        uid: rp.identity,
        name: rp.name || rp.identity,
        photoURL: photoURL,
        isHost: false, // coordinated via Firestore roomSettings
        audioEnabled: hasAudio,
        videoEnabled: hasVideo,
        screenSharing: Boolean(rp.isScreenShareEnabled),
        isHandRaised: false,
        isMutedByHost: false,
        joinedAt: rp.joinedAt ? rp.joinedAt.getTime() : Date.now(),
      });
    });

    this.onParticipantsChanged(list);
  }

  public async disconnect(): Promise<void> {
    try {
      await this.room.disconnect(true);
    } catch {}
    this.remoteMediaStreams.clear();
    this.remoteScreenStreams.clear();
  }
}
