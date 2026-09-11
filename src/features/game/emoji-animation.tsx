"use client";

import { useEffect, useState } from "react";
import type { EmojiReaction } from "@/features/game/emoji-reactions";
import { getEmojiAnimation, EMOJI_ANIMATIONS, EMOJI_LIST } from "@/features/game/emoji-reactions";

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

  // Find the emoji data
  const emojiData = EMOJI_LIST.find((e) => e.emoji === reaction.emoji);
  const imageSrc = emojiData?.image;
  const isSpamSticker = emojiData?.isSpam || false;

  // Check if this sticker is sent TO the current user
  const isForCurrentUser = reaction.toUid === currentUid;

  useEffect(() => {
    // Spam sticker shows for 10 seconds, normal for 2.5 seconds
    const duration = isSpamSticker && isForCurrentUser ? 10000 : 2500;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete(reaction.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [reaction.id, onComplete, isSpamSticker, isForCurrentUser]);

  if (!isVisible) return null;

  // SPAM STICKER - fills entire screen with multiple copies
  if (isSpamSticker && isForCurrentUser) {
    // Generate 20 random positions for spam effect
    const spamCount = 20;
    const spamPositions = Array.from({ length: spamCount }, (_, i) => {
      const startX = Math.random() * 90 + 5; // 5-95%
      const startY = Math.random() * 90 + 5; // 5-95%
      const endX = Math.random() * 90 + 5; // Different end position
      const endY = Math.random() * 90 + 5; // Different end position
      
      return {
        startX,
        startY,
        endX,
        endY,
        delay: i * 0.1, // Stagger appearance
        rotation: Math.random() * 60 - 30, // -30 to 30 degrees
        scale: Math.random() * 0.4 + 0.8, // 0.8 to 1.2
      };
    });

    return (
      <div className="pointer-events-none fixed inset-0 z-50">
        {spamPositions.map((pos, idx) => (
          <div
            key={`${reaction.id}-spam-${idx}`}
            className="absolute animate-sticker-spam"
            style={{
              left: `${pos.startX}%`,
              top: `${pos.startY}%`,
              animationDelay: `${pos.delay}s`,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
              '--start-x': `${pos.startX}%`,
              '--start-y': `${pos.startY}%`,
              '--end-x': `${pos.endX}%`,
              '--end-y': `${pos.endY}%`,
            } as React.CSSProperties}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={emojiData?.label || "spam sticker"}
                className="h-[150px] w-[150px] object-contain opacity-90"
              />
            ) : (
              <span className="text-[100px]">{reaction.emoji}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // NORMAL STICKER - big in center
  if (isForCurrentUser) {
    return (
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
        {/* Big sticker in center with special animation */}
        <div className="animate-sticker-big">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={emojiData?.label || "sticker"}
              className="h-[300px] w-[300px] object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]"
            />
          ) : (
            <span className="text-[200px]">{reaction.emoji}</span>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, show normal floating animation from sender's position
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
      className={`pointer-events-none absolute z-50 ${animationClass}`}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        width: "80px",
        height: "80px",
      }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={emojiData?.label || "sticker"}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-5xl">{reaction.emoji}</span>
      )}
    </div>
  );
}
