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
  public onParticipantsChanged: (participants: Participant[]) => void = () => {};
  public onActiveSpeakersChanged: (speakerIds: string[]) => void = () => {};
  public onDataReceived: (payload: any, peerId: string) => void = () => {};
  public onKicked: () => void = () => {};

  private remoteMediaStreams: Map<string, MediaStream> = new Map();

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
        let stream = this.remoteMediaStreams.get(peerId);
        if (!stream) {
          stream = new MediaStream();
          this.remoteMediaStreams.set(peerId, stream);
        }

        stream.addTrack(track.mediaStreamTrack);
        this.onRemoteStreamAdded(peerId, stream);
        this.syncParticipants();
      }
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        const peerId = participant.identity;
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

  public async publishLocalTracks(audioEnabled: boolean, videoEnabled: boolean): Promise<MediaStream> {
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
      if (pub.track?.mediaStreamTrack) {
        localStream.addTrack(pub.track.mediaStreamTrack);
      }
    });
    return localStream;
  }

  public async setAudioEnabled(enabled: boolean): Promise<MediaStream> {
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
    } catch (err) {
      console.error('Error toggling microphone in LiveKit:', err);
    }
    return this.getLocalStream();
  }

  public async setVideoEnabled(enabled: boolean): Promise<MediaStream> {
    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
    } catch (err) {
      console.error('Error toggling camera in LiveKit:', err);
    }
    return this.getLocalStream();
  }

  public async setScreenShareEnabled(enabled: boolean): Promise<MediaStream | null> {
    const pub = await this.room.localParticipant.setScreenShareEnabled(enabled, {
      audio: true,
      selfBrowserSurface: 'include',
    });

    if (enabled && pub?.track?.mediaStreamTrack) {
      const stream = new MediaStream([pub.track.mediaStreamTrack]);
      return stream;
    }
    return null;
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
