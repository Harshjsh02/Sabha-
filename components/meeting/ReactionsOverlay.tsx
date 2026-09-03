'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ReactionItem } from '@/lib/types';

interface ReactionsOverlayProps {
  latestReaction: ReactionItem | null;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  senderName: string;
  leftOffset: number;
}

export function ReactionsOverlay({ latestReaction }: ReactionsOverlayProps) {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    if (!latestReaction) return;

    // Trigger confetti if celebration emoji
    if (latestReaction.emoji === '🎉') {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.8 },
      });
    }

    const newEmoji: FloatingEmoji = {
      id: `${latestReaction.id}_${Date.now()}_${Math.random()}`,
      emoji: latestReaction.emoji,
      senderName: latestReaction.senderName,
      leftOffset: Math.floor(Math.random() * 80) + 10, // 10% to 90%
    };

    setEmojis((prev) => [...prev, newEmoji]);

    const timer = setTimeout(() => {
      setEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, [latestReaction]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {emojis.map((item) => (
        <div
          key={item.id}
          style={{ left: `${item.leftOffset}%` }}
          className="absolute bottom-24 flex flex-col items-center animate-float-up pointer-events-none select-none"
        >
          <span className="text-4xl filter drop-shadow-lg">{item.emoji}</span>
          <span className="text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1 border border-white/10 shadow">
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}
