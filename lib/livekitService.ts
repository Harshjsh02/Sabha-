import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Track,
  LocalTrackPublication,
  LocalParticipant,
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
  public onKicked: () => void = () => {};
  public onLocalStreamChanged: (stream: MediaStream) => void = () => {};

  private remoteMediaStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();

  constructor(wsUrl: string, token: string, localParticipantInfo: Participant) {
    this.wsUrl = wsUrl;
    this.token = token;
    this.localParticipantInfo = localParticipantInfo;

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720 },
      },
    });

    this.setupListeners();
  }

  private setupListeners() {
    // Track subscribed
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const peerId = participant.identity;

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
        this.onRemoteStreamAdded(peerId, stream);
        this.syncParticipants();
      }
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const peerId = participant.identity;

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
      this.onRemoteStreamRemoved(peerId);
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
        this.onDataReceived(data, participant?.identity || '');
      } catch (err) {
        console.warn('Failed to parse received data packet:', err);
      }
    });

    // Room disconnected
    this.room.on(RoomEvent.Disconnected, () => {
      this.remoteMediaStreams.clear();
    });
  }

  public async connect(): Promise<void> {
    await this.room.connect(this.wsUrl, this.token);
    this.syncParticipants();
  }

  public async publishLocalTracks(
    audioEnabled: boolean,
    videoEnabled: boolean
  ): Promise<MediaStream> {
    try {
      if (videoEnabled) {
        await this.room.localParticipant.setCameraEnabled(true);
      }
      if (audioEnabled) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
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
        localStream.addTrack(pub.track.mediaStreamTrack);
      }
    });
    return localStream;
  }

  public async setAudioEnabled(enabled: boolean): Promise<MediaStream> {
    try {
      const micPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPub) {
        if (enabled) {
          await micPub.unmute();
        } else {
          await micPub.mute();
        }
      } else {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
      }
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
      if (camPub) {
        if (enabled) {
          await camPub.unmute();
        } else {
          await camPub.mute();
        }
      } else {
        await this.room.localParticipant.setCameraEnabled(enabled);
      }
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
      const hasAudio = rp.isMicrophoneEnabled;
      const hasVideo = rp.isCameraEnabled;

      list.push({
        id: rp.identity,
        uid: rp.identity,
        name: rp.name || rp.identity,
        isHost: false, // coordinated via Firestore roomSettings
        audioEnabled: hasAudio,
        videoEnabled: hasVideo,
        screenSharing: rp.isScreenShareEnabled,
        isHandRaised: false,
        isMutedByHost: false,
        joinedAt: rp.joinedAt ? rp.joinedAt.getTime() : Date.now(),
      });
    });

    this.onParticipantsChanged(list);
  }

  public async disconnect(): Promise<void> {
    await this.room.disconnect();
    this.remoteMediaStreams.clear();
  }
}
