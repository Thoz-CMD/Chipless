"use client";

import { useEffect, useState } from "react";
import type { EmojiReaction } from "@/features/game/emoji-reactions";
import { getEmojiAnimation, EMOJI_ANIMATIONS } from "@/features/game/emoji-reactions";

// Same function from game-table.tsx
function getSeatCoordinates(index: number, total: number, currentUid?: string): { x: number; y: number } {
  if (total <= 0) {
    return { x: 50, y: 50 };
  }

  const angle = (index / total) * 2 * Math.PI + Math.PI / 2;
  const radiusX = 40;
  const radiusY = 36;

  return {
    x: 50 + radiusX * Math.cos(angle),
    y: 47 + radiusY * Math.sin(angle),
  };
}

export function EmojiAnimation({
  reaction,
  playerIndex,
  totalPlayers,
  currentUid,
  onComplete,
}: {
  reaction: EmojiReaction;
  playerIndex?: number;
  totalPlayers: number;
  currentUid?: string;
  onComplete: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-remove after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete(reaction.id), 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [reaction.id, onComplete]);

  if (!isVisible) return null;

  const animationType = getEmojiAnimation(reaction.emoji);
  const animationClass = EMOJI_ANIMATIONS[animationType];

  // Calculate position based on player's seat
  let startX: number;
  let startY: number;

  if (playerIndex !== undefined && playerIndex >= 0) {
    // Get the seat coordinates for this player
    const coords = getSeatCoordinates(playerIndex, totalPlayers, currentUid);
    // Offset to top-right of avatar (avatar is centered at coords)
    // Avatar is roughly 48px (size-12), so offset by ~3% right and ~3% up
    startX = coords.x + 3;
    startY = coords.y - 10;
  } else if (reaction.x !== undefined && reaction.y !== undefined) {
    // Use provided position
    startX = reaction.x;
    startY = reaction.y;
  } else {
    // Fallback to random position
    startX = Math.random() * 60 + 20; // 20-80%
    startY = Math.random() * 40 + 30; // 30-70%
  }

  return (
    <div
      className={`pointer-events-none absolute z-50 text-5xl ${animationClass}`}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
      }}
    >
      {reaction.emoji}
    </div>
  );
}
