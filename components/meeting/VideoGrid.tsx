'use client';

import React, { useState } from 'react';
import { Participant } from '@/lib/types';
import { VideoTile } from './VideoTile';

interface VideoGridProps {
  localParticipant: Participant;
  localStream: MediaStream | null;
  remoteParticipants: Participant[];
  remoteStreams: Map<string, MediaStream>;
  isHostViewer: boolean;
  onMuteParticipant?: (id: string) => void;
  onKickParticipant?: (id: string) => void;
}

export function VideoGrid({
  localParticipant,
  localStream,
  remoteParticipants,
  remoteStreams,
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

  // If someone is pinned, show Speaker / Spotlight layout
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
