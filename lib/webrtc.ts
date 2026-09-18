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
  private localScreenStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private isPolite: Map<string, boolean> = new Map();
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cachedParticipants: Participant[] = [];

  // Callbacks
  public onRemoteStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteStreamRemoved: (peerId: string) => void = () => {};
  public onRemoteScreenStreamAdded: (peerId: string, stream: MediaStream) => void = () => {};
  public onRemoteScreenStreamRemoved: (peerId: string) => void = () => {};
  public onParticipantsChanged: (participants: Participant[]) => void = () => {};
  public onMuteRequested: () => void = () => {};
  public onKicked: (reason?: string) => void = () => {};
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
      const audioTrack = stream.getAudioTracks()[0];
      const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio' || (s as any).kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(audioTrack || null);
      }

      // Camera video sender is the first video transceiver
      const videoTransceivers = pc.getTransceivers().filter(
        (t) =>
          (t.sender.track && t.sender.track.kind === 'video') ||
          (t.receiver.track && t.receiver.track.kind === 'video') ||
          ((t as any).kind === 'video')
      );
      const cameraTransceiver = videoTransceivers[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (cameraTransceiver?.sender) {
        cameraTransceiver.sender.replaceTrack(videoTrack || null);
      }
    });
  }

  public setScreenStream(stream: MediaStream | null) {
    this.localScreenStream = stream;
    const screenTrack = stream?.getVideoTracks()[0] || null;

    this.peerConnections.forEach((pc) => {
      const videoTransceivers = pc.getTransceivers().filter(
        (t) =>
          (t.sender.track && t.sender.track.kind === 'video') ||
          (t.receiver.track && t.receiver.track.kind === 'video') ||
          ((t as any).kind === 'video')
      );
      // The second video transceiver is dedicated to screen share
      const screenTransceiver = videoTransceivers[1];
      if (screenTransceiver?.sender) {
        screenTransceiver.sender.replaceTrack(screenTrack);
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

      // 2. Listen to participants list and prune stale participants (with clock drift tolerance)
      const participantsCol = collection(db, `rooms/${this.roomId}/participants`);
      this.unsubParticipants = onSnapshot(participantsCol, (snapshot) => {
        const now = Date.now();
        const list: Participant[] = [];
        snapshot.forEach((d) => {
          const p = d.data() as Participant & { lastSeen?: number };
          // Only prune if a peer's heartbeat is older than 60s (prevents cross-device clock skew from deleting active peers)
          if (p.id !== this.localParticipant.id && p.lastSeen && now - p.lastSeen > 60000) {
            deleteDoc(d.ref).catch(() => {});
            return;
          }
          list.push(p);
        });
        this.cachedParticipants = list;
        this.onParticipantsChanged(list);
        this.reconcilePeers(list);
      });

      // 3. Listen to incoming signals directed to me or broadcast
      const signalsCol = collection(db, `rooms/${this.roomId}/signals`);
      const q = query(
        signalsCol,
        where('to', 'in', [this.localParticipant.id, 'broadcast'])
      );

      this.unsubSignals = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as SignalData;
            await this.handleSignalMessage(data);
            // Delete processed signal to keep firestore footprint minimal
            // Only delete if specifically addressed to me (never delete broadcast signals so other peers receive them)
            if (data.to === this.localParticipant.id) {
              try {
                await deleteDoc(change.doc.ref);
              } catch {}
            }
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
        this.remoteScreenStreams.delete(peerId);
        this.pendingCandidates.delete(peerId);
        this.onRemoteStreamRemoved(peerId);
        this.onRemoteScreenStreamRemoved(peerId);
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

    // Ensure audio and camera video tracks or transceivers are present so SDP negotiates bidirectional m-lines upfront
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

    // Dedicated screen share video transceiver (index 1 of video transceivers)
    const screenTrack = this.localScreenStream?.getVideoTracks()[0];
    if (screenTrack) {
      pc.addTrack(screenTrack, this.localScreenStream!);
    } else {
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {}
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const videoTransceivers = pc.getTransceivers().filter(
        (t) =>
          (t.sender.track && t.sender.track.kind === 'video') ||
          (t.receiver.track && t.receiver.track.kind === 'video') ||
          ((t as any).kind === 'video')
      );
      const isScreenTrack =
        event.track.kind === 'video' &&
        videoTransceivers.length > 1 &&
        event.transceiver === videoTransceivers[1];

      if (isScreenTrack) {
        let stream = this.remoteScreenStreams.get(peerId);
        if (!stream) {
          stream = new MediaStream();
          this.remoteScreenStreams.set(peerId, stream);
        }
        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        this.onRemoteScreenStreamAdded(peerId, new MediaStream(stream.getTracks()));

        const handleScreenEnded = () => {
          this.remoteScreenStreams.delete(peerId);
          this.onRemoteScreenStreamRemoved(peerId);
        };
        event.track.onended = handleScreenEnded;
        event.track.onmute = handleScreenEnded;
        return;
      }

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

    // Renegotiation handler for dynamically added tracks (e.g. screen share or video start)
    let isInitialSetup = true;
    setTimeout(() => {
      isInitialSetup = false;
    }, 2000);

    pc.onnegotiationneeded = async () => {
      try {
        if (isInitialSetup || pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
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
      const reason = (signal.payload as any)?.reason || 'kicked';
      this.onKicked(reason);
      return;
    }

    if ((signal.type as any) === 'whiteboard') {
      this.onWhiteboardReceived(signal.payload);
      return;
    }

    if ((signal.type as any) === 'participant-update') {
      const updates = signal.payload as Partial<Participant> & { targetPeerId?: string };
      const targetId = updates.targetPeerId || fromPeerId;
      if (targetId === this.localParticipant.id) {
        Object.assign(this.localParticipant, updates);
      }
      this.cachedParticipants = this.cachedParticipants.map((p) =>
        p.id === targetId ? { ...p, ...updates } : p
      );
      this.onParticipantsChanged(this.cachedParticipants);
      return;
    }

    let pc = this.peerConnections.get(fromPeerId);
    if (!pc) {
      // Other peer initiated connection
      const isInitiator = this.localParticipant.id > fromPeerId;
      this.isPolite.set(fromPeerId, !isInitiator);
      pc = await this.createPeerConnection(fromPeerId, false);
    }

    if (signal.type === 'offer') {
      try {
        const isPolite = this.isPolite.get(fromPeerId) ?? (this.localParticipant.id < fromPeerId);
        const offerCollision = pc.signalingState !== 'stable';

        if (offerCollision) {
          if (!isPolite) {
            console.warn(`[WebRTC] Impolite peer ignoring colliding offer from ${fromPeerId}`);
            return;
          }
          console.log(`[WebRTC] Polite peer rolling back to accept offer from ${fromPeerId}`);
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch (rollbackErr) {
            console.warn('[WebRTC] Rollback notice:', rollbackErr);
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));

        // Flush any queued candidates
        const pending = this.pendingCandidates.get(fromPeerId) || [];
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
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
        // Prevent InvalidStateError if answer arrives when already in stable state
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`[WebRTC] Ignoring unexpected answer in signalingState: ${pc.signalingState}`);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));

        const pending = this.pendingCandidates.get(fromPeerId) || [];
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
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

  public async sendKickCommand(targetPeerId: string, reason: 'kicked' | 'meeting-ended' = 'kicked') {
    await this.sendSignal({
      from: this.localParticipant.id,
      to: targetPeerId,
      type: 'kick-command',
      payload: { reason },
      timestamp: Date.now(),
    });

    if (isFirebaseConfigured() && db && targetPeerId !== 'broadcast') {
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

    // 1. Broadcast immediately to peers for instant 0ms UI update
    this.sendSignal({
      from: this.localParticipant.id,
      to: 'broadcast',
      type: 'participant-update' as any,
      payload: updates,
      timestamp: Date.now(),
    });

    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${this.roomId}/participants/${this.localParticipant.id}`);
        await updateDoc(participantRef, updates);
      } catch {}
    }
  }

  public async updatePeerRole(peerId: string, updates: Partial<Participant>) {
    this.cachedParticipants = this.cachedParticipants.map((p) =>
      p.id === peerId ? { ...p, ...updates } : p
    );
    this.onParticipantsChanged(this.cachedParticipants);

    this.sendSignal({
      from: this.localParticipant.id,
      to: 'broadcast',
      type: 'participant-update' as any,
      payload: { targetPeerId: peerId, ...updates },
      timestamp: Date.now(),
    });

    if (isFirebaseConfigured() && db) {
      try {
        const participantRef = doc(db, `rooms/${this.roomId}/participants/${peerId}`);
        await updateDoc(participantRef, updates);
      } catch (err) {
        console.warn('Error updating peer role in Firestore:', err);
      }
    }
  }

  private removeDeadPeer(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.remoteScreenStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.onRemoteStreamRemoved(peerId);
    this.onRemoteScreenStreamRemoved(peerId);
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
    this.remoteScreenStreams.clear();
    this.pendingCandidates.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
