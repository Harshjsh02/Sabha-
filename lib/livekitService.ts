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
    const localTracks = await this.room.localParticipant.setCameraEnabled(videoEnabled);
    await this.room.localParticipant.setMicrophoneEnabled(audioEnabled);

    const localStream = new MediaStream();
    this.room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track?.mediaStreamTrack) {
        localStream.addTrack(pub.track.mediaStreamTrack);
      }
    });

    return localStream;
  }

  public async setAudioEnabled(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  public async setVideoEnabled(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setCameraEnabled(enabled);
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
        isHost: false, // will be coordinated via Firestore roomSettings
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
