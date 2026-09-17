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
}

function ScreenPresentationStage({
  stream,
  presenter,
  isLocal,
  onStopScreenShare,
}: {
  stream: MediaStream;
  presenter: Participant;
  isLocal: boolean;
  onStopScreenShare?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // 1. Spotlight Presentation Stage (Active screen share takes primary spotlight)
  if (isScreenSharingActive && presentationStream && presenter) {
    return (
      <div className="flex-1 flex flex-col h-full gap-3 p-3 overflow-hidden">
        {/* Main Presentation Stage */}
        <div className="flex-1 min-h-0 relative">
          <ScreenPresentationStage
            stream={presentationStream}
            presenter={presenter}
            isLocal={isLocalScreenSharing}
            onStopScreenShare={onStopScreenShare}
          />
        </div>

        {/* Participant Filmstrip Below Presentation */}
        <div className="h-32 sm:h-36 flex gap-3 overflow-x-auto pb-1 flex-shrink-0">
          {allParticipants.map((p) => (
            <div key={p.id} className="w-44 sm:w-48 h-full flex-shrink-0">
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

  // 2. Speaker / Spotlight layout if someone is pinned
  if (pinnedId) {
    const pinnedParticipant = allParticipants.find((p) => p.id === pinnedId) || localParticipant;
    const otherParticipants = allParticipants.filter((p) => p.id !== pinnedParticipant.id);

    return (
      <div className="flex-1 flex flex-col h-full gap-3 p-3 overflow-hidden">
        {/* Main Pinned Stage */}
        <div className="flex-1 min-h-0 relative">
          <VideoTile
            participant={pinnedParticipant}
            stream={getStreamForParticipant(pinnedParticipant.id)}
            isLocal={pinnedParticipant.id === localParticipant.id}
            isHostViewer={isHostViewer}
            isPinned={true}
            onTogglePin={togglePin}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        </div>

        {/* Thumbnail Filmstrip */}
        {otherParticipants.length > 0 && (
          <div className="h-36 flex gap-3 overflow-x-auto pb-1 flex-shrink-0">
            {otherParticipants.map((p) => (
              <div key={p.id} className="w-48 h-full flex-shrink-0">
                <VideoTile
                  participant={p}
                  stream={getStreamForParticipant(p.id)}
                  isLocal={p.id === localParticipant.id}
                  isHostViewer={isHostViewer}
                  isPinned={false}
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

  // Adaptive Grid Layout based on participant count
  let gridClasses = 'grid-cols-1';
  if (totalCount === 2) {
    gridClasses = 'grid-cols-1 md:grid-cols-2';
  } else if (totalCount >= 3 && totalCount <= 4) {
    gridClasses = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalCount >= 5 && totalCount <= 6) {
    gridClasses = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  } else if (totalCount > 6) {
    gridClasses = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="flex-1 h-full p-3 overflow-y-auto">
      <div className={`grid ${gridClasses} gap-3 h-full auto-rows-fr`}>
        {/* Local user tile */}
        <VideoTile
          participant={localParticipant}
          stream={localStream}
          isLocal={true}
          isHostViewer={isHostViewer}
          isPinned={false}
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
            isPinned={false}
            onTogglePin={togglePin}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
          />
        ))}
      </div>
    </div>
  );
}
