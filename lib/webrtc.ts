import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Participant, SignalData } from './types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private roomId: string;
  private localParticipant: Participant;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private isPolite: Map<string, boolean> = new Map();
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Callbacks
  public onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteStreamRemoved: (peerId: string) => void = () => {};
  public onParticipantsChanged: (participants: Participant[]) => void = () => {};
  public onMuteRequested: () => void = () => {};
  public onKicked: () => void = () => {};
  public onWhiteboardReceived: (event: any) => void = () => {};

  // Cleanups
  private unsubParticipants: (() => void) | null = null;
  private unsubSignals: (() => void) | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(roomId: string, localParticipant: Participant) {
    this.roomId = roomId;
    this.localParticipant = localParticipant;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(`sabha_room_${roomId}`);
      this.broadcastChannel.onmessage = (event) => {
        this.handleSignalMessage(event.data);
      };
    }
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // Update tracks for existing peer connections
    this.peerConnections.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        const sender =
          pc.getSenders().find((s) => s.track && s.track.kind === track.kind) ||
          pc.getSenders().find((s) => !s.track && (s as any).kind === track.kind) ||
          pc.getTransceivers().find(
            (t) =>
              (t.sender.track && t.sender.track.kind === track.kind) ||
              (t.receiver.track && t.receiver.track.kind === track.kind)
          )?.sender;

        if (sender) {
          sender.replaceTrack(track);
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (err) {
            console.warn('WebRTC addTrack notice:', err);
          }
        }
      });

      // If video track was removed or empty, replace video sender with null
      if (stream.getVideoTracks().length === 0) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(null);
        }
      }
    });
  }

  public async joinRoom(): Promise<void> {
    const isFirebase = isFirebaseConfigured() && db !== null;

    if (isFirebase && db) {
      // 1. Register participant in Firestore
      const participantRef = doc(db, `rooms/${this.roomId}/participants/${this.localParticipant.id}`);
      await setDoc(participantRef, {
        ...this.localParticipant,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      });

      // Periodic heartbeat to keep presence alive
      this.heartbeatTimer = setInterval(async () => {
        try {
          await updateDoc(participantRef, { lastSeen: Date.now() });
        } catch {}
      }, 5000);

      // 2. Listen to participants list and prune stale participants
      const participantsCol = collection(db, `rooms/${this.roomId}/participants`);
      this.unsubParticipants = onSnapshot(participantsCol, (snapshot) => {
        const now = Date.now();
        const list: Participant[] = [];
        snapshot.forEach((d) => {
          const p = d.data() as Participant & { lastSeen?: number };
          // If a peer's heartbeat is older than 15s (e.g. killed app/browser without clean unload), prune them
          if (p.id !== this.localParticipant.id && p.lastSeen && now - p.lastSeen > 15000) {
            deleteDoc(d.ref).catch(() => {});
            return;
          }
          list.push(p);
        });
        this.onParticipantsChanged(list);
        this.reconcilePeers(list);
      });

      // 3. Listen to incoming signals directed to me
      const signalsCol = collection(db, `rooms/${this.roomId}/signals`);
      const q = query(
        signalsCol,
        where('to', '==', this.localParticipant.id)
      );

      this.unsubSignals = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as SignalData;
            await this.handleSignalMessage(data);
            // Delete processed signal to keep firestore footprint minimal
            try {
              await deleteDoc(change.doc.ref);
            } catch {}
          }
        });
      });
    } else {
      // Local broadcast fallback (for zero-config multi-tab testing)
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          from: this.localParticipant.id,
          to: 'broadcast',
          type: 'participant-join',
          payload: this.localParticipant,
          timestamp: Date.now(),
        });
      }
    }
  }

  private async reconcilePeers(participants: Participant[]) {
    const currentPeerIds = new Set(
      participants
        .filter((p) => p.id !== this.localParticipant.id)
        .map((p) => p.id)
    );

    // Close removed connections
    this.peerConnections.forEach((pc, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        pc.close();
        this.peerConnections.delete(peerId);
        this.remoteStreams.delete(peerId);
        this.pendingCandidates.delete(peerId);
        this.onRemoteStreamRemoved(peerId);
      }
    });

    // Create connections for new peers
    // Use alphabetical tie-breaking to decide who creates offer to avoid collision
    for (const peer of participants) {
      if (peer.id === this.localParticipant.id) continue;

      if (!this.peerConnections.has(peer.id)) {
        const isInitiator = this.localParticipant.id > peer.id;
        this.isPolite.set(peer.id, !isInitiator);
        await this.createPeerConnection(peer.id, isInitiator);
      }
    }
  }

  private async createPeerConnection(peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerId, pc);

    // Ensure both audio and video tracks or transceivers are present so SDP negotiates both bidirectional m-lines upfront
    const audioTrack = this.localStream?.getAudioTracks()[0];
    const videoTrack = this.localStream?.getVideoTracks()[0];

    if (audioTrack) {
      pc.addTrack(audioTrack, this.localStream!);
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {}
    }

    if (videoTrack) {
      pc.addTrack(videoTrack, this.localStream!);
    } else {
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {}
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      let stream = event.streams[0];
      if (!stream) {
        stream = this.remoteStreams.get(peerId) || new MediaStream();
        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
      }
      this.remoteStreams.set(peerId, stream);
      this.onRemoteStreamAdded(peerId, new MediaStream(stream.getTracks()));

      event.track.onended = () => {
        const curr = this.remoteStreams.get(peerId);
        if (curr) {
          this.onRemoteStreamAdded(peerId, new MediaStream(curr.getTracks()));
        }
      };

      event.track.onunmute = () => {
        const curr = this.remoteStreams.get(peerId);
        if (curr) {
          this.onRemoteStreamAdded(peerId, new MediaStream(curr.getTracks()));
        }
      };
    };

    // Renegotiation handler for dynamically added tracks
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.sendSignal({
          from: this.localParticipant.id,
          to: peerId,
          type: 'offer',
          payload: offer,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('Renegotiation notice for peer', peerId, err);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          from: this.localParticipant.id,
          to: peerId,
          type: 'candidate',
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'disconnected') {
        this.onRemoteStreamRemoved(peerId);
        // If disconnected for > 2.5s (e.g. mobile app swiped away/closed), clean up peer immediately
        if (!this.disconnectTimers.has(peerId)) {
          const timer = setTimeout(() => {
            const currentPc = this.peerConnections.get(peerId);
            if (
              currentPc &&
              (currentPc.connectionState === 'disconnected' ||
                currentPc.connectionState === 'failed' ||
                currentPc.connectionState === 'closed')
            ) {
              this.removeDeadPeer(peerId);
            }
            this.disconnectTimers.delete(peerId);
          }, 2500);
          this.disconnectTimers.set(peerId, timer);
        }
      } else if (state === 'connected') {
        const timer = this.disconnectTimers.get(peerId);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(peerId);
        }
      } else if (state === 'failed' || state === 'closed') {
        const timer = this.disconnectTimers.get(peerId);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(peerId);
        }
        this.removeDeadPeer(peerId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await this.sendSignal({
          from: this.localParticipant.id,
          to: peerId,
          type: 'offer',
          payload: offer,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error creating offer for peer', peerId, err);
      }
    }

    return pc;
  }

  private async handleSignalMessage(signal: SignalData) {
    if (!signal || signal.from === this.localParticipant.id) return;
    if (signal.to !== this.localParticipant.id && signal.to !== 'broadcast') return;

    const fromPeerId = signal.from;

    if (signal.type === 'mute-command') {
      this.onMuteRequested();
      return;
    }

    if (signal.type === 'kick-command') {
      this.onKicked();
      return;
    }

    if ((signal.type as any) === 'whiteboard') {
      this.onWhiteboardReceived(signal.payload);
      return;
    }

    let pc = this.peerConnections.get(fromPeerId);
    if (!pc) {
      // Other peer initiated connection
      pc = await this.createPeerConnection(fromPeerId, false);
    }

    if (signal.type === 'offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));

        // Flush any queued candidates
        const pending = this.pendingCandidates.get(fromPeerId) || [];
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates.delete(fromPeerId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.sendSignal({
          from: this.localParticipant.id,
          to: fromPeerId,
          type: 'answer',
          payload: answer,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } else if (signal.type === 'answer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));

        const pending = this.pendingCandidates.get(fromPeerId) || [];
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates.delete(fromPeerId);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    } else if (signal.type === 'candidate') {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
        } else {
          const pending = this.pendingCandidates.get(fromPeerId) || [];
          pending.push(signal.payload);
          this.pendingCandidates.set(fromPeerId, pending);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }

  private async sendSignal(signal: SignalData) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(signal);
    }

    if (isFirebaseConfigured() && db) {
      try {
        const signalsCol = collection(db, `rooms/${this.roomId}/signals`);
        await addDoc(signalsCol, signal);
      } catch (err) {
        console.warn('Could not post signal to Firestore:', err);
      }
    }
  }

  // Host Admin controls
  public async sendMuteCommand(targetPeerId: string) {
    await this.sendSignal({
      from: this.localParticipant.id,
      to: targetPeerId,
      type: 'mute-command',
      payload: {},
      timestamp: Date.now(),
    });
  }

  public async sendMuteAllCommand(participants: Participant[]) {
    for (const p of participants) {
      if (p.id !== this.localParticipant.id) {
        await this.sendMuteCommand(p.id);
      }
    }
  }

  public async sendKickCommand(targetPeerId: string) {
    await this.sendSignal({
      from: this.localParticipant.id,
      to: targetPeerId,
      type: 'kick-command',
      payload: {},
      timestamp: Date.now(),
    });

    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${this.roomId}/participants/${targetPeerId}`);
        await deleteDoc(participantRef);
      } catch {}
    }
  }

  public async sendWhiteboardEvent(payload: any) {
    await this.sendSignal({
      from: this.localParticipant.id,
      to: 'broadcast',
      type: 'whiteboard' as any,
      payload,
      timestamp: Date.now(),
    });
  }

  public async updateParticipantState(updates: Partial<Participant>) {
    Object.assign(this.localParticipant, updates);

    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${this.roomId}/participants/${this.localParticipant.id}`);
        await updateDoc(participantRef, updates);
      } catch {}
    }
  }

  private removeDeadPeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.onRemoteStreamRemoved(peerId);

    if (isFirebaseConfigured() && db) {
      try {
        const deadRef = doc(db, `rooms/${this.roomId}/participants/${peerId}`);
        deleteDoc(deadRef).catch(() => {});
      } catch {}
    }
  }

  public async leaveRoom(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.disconnectTimers.forEach((timer) => clearTimeout(timer));
    this.disconnectTimers.clear();

    if (this.unsubParticipants) {
      this.unsubParticipants();
      this.unsubParticipants = null;
    }
    if (this.unsubSignals) {
      this.unsubSignals();
      this.unsubSignals = null;
    }

    // Remove from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${this.roomId}/participants/${this.localParticipant.id}`);
        await deleteDoc(participantRef);
      } catch {}
    }

    // Close all peer connections
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
