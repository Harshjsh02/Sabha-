'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Participant } from '@/lib/types';
import { VideoTile } from './VideoTile';
import { Maximize2, Monitor } from 'lucide-react';

interface VideoGridProps {
  localParticipant: Participant;
  localStream: MediaStream | null;
  remoteParticipants: Participant[];
  remoteStreams: Map<string, MediaStream>;
  screenStream?: MediaStream | null;
  remoteScreenStreams?: Map<string, MediaStream>;
  onStopScreenShare?: () => void;
  isHostViewer: boolean;
  onMuteParticipant?: (id: string) => void;
  onKickParticipant?: (id: string) => void;
  viewMode?: 'gallery' | 'speaker' | 'multi-speaker';
}

function ScreenPresentationStage({
  stream,
  presenter,
  presenterStream,
  isLocal,
  onStopScreenShare,
}: {
  stream: MediaStream;
  presenter: Participant;
  presenterStream?: MediaStream | null;
  isLocal: boolean;
  onStopScreenShare?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const presenterVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPip, setShowPip] = useState(true);
  const stageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.play().catch((err) => {
      console.warn('Screen share playback notice:', err);
    });
  }, [stream]);

  // Check if presenter has a live camera video track
  const presenterHasLiveVideo = Boolean(
    presenterStream &&
      presenterStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
  );

  useEffect(() => {
    const pVideo = presenterVideoRef.current;
    if (!pVideo || !presenterStream || !presenterHasLiveVideo) return;
    if (pVideo.srcObject !== presenterStream) {
      pVideo.srcObject = presenterStream;
    }
    pVideo.play().catch((err) => {
      console.warn('Presenter PIP video playback notice:', err);
    });
  }, [presenterStream, presenterHasLiveVideo, showPip]);

  const toggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={stageContainerRef}
      className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-2xl"
    >
      {/* Presentation Stream - object-contain preserves high fidelity for slides & code */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-contain bg-slate-950"
      />

      {/* Floating Presenter Face Camera (Zoom-style Picture-in-Picture) */}
      {presenterHasLiveVideo && showPip && (
        <div className="absolute top-14 right-3 w-36 h-24 sm:w-48 sm:h-32 rounded-xl overflow-hidden border-2 border-indigo-500/60 shadow-2xl bg-slate-900/90 backdrop-blur z-20 group/pip">
          <video
            ref={presenterVideoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 right-1 opacity-0 group-hover/pip:opacity-100 transition">
            <button
              onClick={() => setShowPip(false)}
              className="px-1.5 py-0.5 rounded bg-black/80 hover:bg-black text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
              title="Hide Presenter Camera"
            >
              ✕
            </button>
          </div>
          <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] text-white font-medium truncate max-w-[85%]">
              {isLocal ? 'You' : presenter.name}
            </span>
          </div>
        </div>
      )}

      {presenterHasLiveVideo && !showPip && (
        <button
          onClick={() => setShowPip(true)}
          className="absolute top-14 right-3 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-white shadow-lg z-20 flex items-center gap-1.5 transition cursor-pointer"
          title="Show Presenter Camera"
        >
          <span>👤 Show Camera</span>
        </button>
      )}

      {/* Top Banner Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg pointer-events-auto">
          <Monitor className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">
            {isLocal ? 'You are sharing your screen' : `${presenter.name} is presenting`}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isLocal && onStopScreenShare && (
            <button
              onClick={onStopScreenShare}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              Stop Sharing
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoGrid({
  localParticipant,
  localStream,
  remoteParticipants,
  remoteStreams,
  screenStream,
  remoteScreenStreams,
  onStopScreenShare,
  isHostViewer,
  onMuteParticipant,
  onKickParticipant,
  viewMode = 'gallery',
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const allParticipants = [localParticipant, ...remoteParticipants];
  const totalCount = allParticipants.length;

  const togglePin = (id: string) => {
    setPinnedId((current) => (current === id ? null : id));
  };

  const getStreamForParticipant = (id: string): MediaStream | null => {
    if (id === localParticipant.id) return localStream;
    return remoteStreams.get(id) || null;
  };

  // Check if anyone is presenting their screen
  const isLocalScreenSharing = Boolean(localParticipant.screenSharing && screenStream);
  const remoteScreenPresenter =
    remoteParticipants.find(
      (p) => p.screenSharing && ((remoteScreenStreams && remoteScreenStreams.has(p.id)) || remoteStreams.has(p.id))
    ) ||
    (remoteScreenStreams && remoteScreenStreams.size > 0
      ? remoteParticipants.find((p) => remoteScreenStreams.has(p.id))
      : undefined);

  const remoteScreenStream = remoteScreenPresenter
    ? (remoteScreenStreams && remoteScreenStreams.get(remoteScreenPresenter.id)) ||
      remoteStreams.get(remoteScreenPresenter.id) ||
      null
    : null;

  const isScreenSharingActive = Boolean(
    isLocalScreenSharing || (remoteScreenPresenter && remoteScreenStream)
  );

  const presentationStream = isLocalScreenSharing
    ? screenStream
    : remoteScreenStream;

  const presenter = isLocalScreenSharing
    ? localParticipant
    : remoteScreenPresenter || null;

  // 1. Spotlight Presentation Stage (Active screen share takes primary spotlight across all view modes)
  if (isScreenSharingActive && presentationStream && presenter) {
    return (
      <div className="flex-1 flex flex-col h-full gap-2.5 p-2 sm:p-3 overflow-hidden">
        {/* Main Presentation Stage */}
        <div className="flex-1 min-h-0 relative">
          <ScreenPresentationStage
            stream={presentationStream}
            presenter={presenter}
            presenterStream={getStreamForParticipant(presenter.id)}
            isLocal={isLocalScreenSharing}
            onStopScreenShare={onStopScreenShare}
          />
        </div>

        {/* Participant Filmstrip Below Presentation */}
        <div className="h-28 sm:h-36 flex gap-2.5 overflow-x-auto pb-1 flex-shrink-0">
          {allParticipants.map((p) => (
            <div key={p.id} className="w-40 sm:w-48 h-full flex-shrink-0">
              <VideoTile
                participant={p}
                stream={getStreamForParticipant(p.id)}
                isLocal={p.id === localParticipant.id}
                isHostViewer={isHostViewer}
                isPinned={pinnedId === p.id}
                onTogglePin={togglePin}
                onMuteParticipant={onMuteParticipant}
                onKickParticipant={onKickParticipant}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Speaker View Mode (or if user pinned someone)
  if (viewMode === 'speaker' || (pinnedId && viewMode !== 'gallery')) {
    const speaker = pinnedId
      ? allParticipants.find((p) => p.id === pinnedId) || allParticipants[0]
      : allParticipants.find((p) => p.id !== localParticipant.id && p.audioEnabled) ||
        remoteParticipants[0] ||
        localParticipant;

    const otherParticipants = allParticipants.filter((p) => p.id !== speaker.id);

    return (
      <div className="flex-1 flex flex-col h-full gap-2.5 p-2 sm:p-3 overflow-hidden">
        {/* Main Active Speaker Stage */}
        <div className="flex-1 min-h-0 relative">
          <VideoTile
            participant={speaker}
            stream={getStreamForParticipant(speaker.id)}
            isLocal={speaker.id === localParticipant.id}
            isHostViewer={isHostViewer}
            isPinned={pinnedId === speaker.id}
            onTogglePin={togglePin}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        </div>

        {/* Thumbnail Filmstrip of Other Participants */}
        {otherParticipants.length > 0 && (
          <div className="h-28 sm:h-36 flex gap-2.5 overflow-x-auto pb-1 flex-shrink-0">
            {otherParticipants.map((p) => (
              <div key={p.id} className="w-40 sm:w-48 h-full flex-shrink-0">
                <VideoTile
                  participant={p}
                  stream={getStreamForParticipant(p.id)}
                  isLocal={p.id === localParticipant.id}
                  isHostViewer={isHostViewer}
                  isPinned={pinnedId === p.id}
                  onTogglePin={togglePin}
                  onMuteParticipant={onMuteParticipant}
                  onKickParticipant={onKickParticipant}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Multi-Speaker View Mode (highlights top 2-4 speakers side-by-side with filmstrip)
  if (viewMode === 'multi-speaker' && totalCount >= 3) {
    // Sort participants: pinned first, then audio active, then others
    const sorted = [...allParticipants].sort((a, b) => {
      if (a.id === pinnedId) return -1;
      if (b.id === pinnedId) return 1;
      if (a.audioEnabled && !b.audioEnabled) return -1;
      if (!a.audioEnabled && b.audioEnabled) return 1;
      return 0;
    });

    const maxSpeakers = totalCount <= 4 ? 2 : 4;
    const mainSpeakers = sorted.slice(0, maxSpeakers);
    const filmstripParticipants = sorted.slice(maxSpeakers);

    return (
      <div className="flex-1 flex flex-col h-full gap-2.5 p-2 sm:p-3 overflow-hidden">
        {/* Multi-Speaker Stage */}
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 h-full auto-rows-fr">
            {mainSpeakers.map((p) => (
              <VideoTile
                key={p.id}
                participant={p}
                stream={getStreamForParticipant(p.id)}
                isLocal={p.id === localParticipant.id}
                isHostViewer={isHostViewer}
                isPinned={pinnedId === p.id}
                onTogglePin={togglePin}
                onMuteParticipant={onMuteParticipant}
                onKickParticipant={onKickParticipant}
              />
            ))}
          </div>
        </div>

        {/* Filmstrip for remaining participants */}
        {filmstripParticipants.length > 0 && (
          <div className="h-28 sm:h-36 flex gap-2.5 overflow-x-auto pb-1 flex-shrink-0">
            {filmstripParticipants.map((p) => (
              <div key={p.id} className="w-40 sm:w-48 h-full flex-shrink-0">
                <VideoTile
                  participant={p}
                  stream={getStreamForParticipant(p.id)}
                  isLocal={p.id === localParticipant.id}
                  isHostViewer={isHostViewer}
                  isPinned={pinnedId === p.id}
                  onTogglePin={togglePin}
                  onMuteParticipant={onMuteParticipant}
                  onKickParticipant={onKickParticipant}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. Gallery View Mode (Default Zoom Grid)
  // Single participant layout
  if (totalCount === 1) {
    return (
      <div className="flex-1 h-full p-3 sm:p-4 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-4xl h-full max-h-[85vh]">
          <VideoTile
            participant={localParticipant}
            stream={localStream}
            isLocal={true}
            isHostViewer={isHostViewer}
            isPinned={false}
            onTogglePin={togglePin}
          />
        </div>
      </div>
    );
  }

  // Adaptive Grid Layout based on participant count
  let gridClasses = 'grid-cols-1';
  if (totalCount === 2) {
    gridClasses = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalCount >= 3 && totalCount <= 4) {
    gridClasses = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalCount >= 5 && totalCount <= 6) {
    gridClasses = 'grid-cols-2 sm:grid-cols-3';
  } else if (totalCount >= 7 && totalCount <= 9) {
    gridClasses = 'grid-cols-2 sm:grid-cols-3';
  } else if (totalCount > 9) {
    gridClasses = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="flex-1 h-full p-2 sm:p-3 overflow-y-auto">
      <div className={`grid ${gridClasses} gap-2.5 sm:gap-3 h-full auto-rows-fr`}>
        {/* Local user tile */}
        <VideoTile
          participant={localParticipant}
          stream={localStream}
          isLocal={true}
          isHostViewer={isHostViewer}
          isPinned={pinnedId === localParticipant.id}
          onTogglePin={togglePin}
        />

        {/* Remote participant tiles */}
        {remoteParticipants.map((p) => (
          <VideoTile
            key={p.id}
            participant={p}
            stream={remoteStreams.get(p.id) || null}
            isLocal={false}
            isHostViewer={isHostViewer}
            isPinned={pinnedId === p.id}
            onTogglePin={togglePin}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        ))}
      </div>
    </div>
  );
}
