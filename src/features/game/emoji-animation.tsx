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
  recipientIndex,
  totalPlayers,
  currentUid,
  onComplete,
}: {
  reaction: EmojiReaction;
  playerIndex?: number;
  recipientIndex?: number;
  totalPlayers: number;
  currentUid?: string;
  onComplete: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  // Find the emoji data
  const emojiData = EMOJI_LIST.find((e) => e.emoji === reaction.emoji);
  const imageSrc = emojiData?.image;
  const isSpamSticker = emojiData?.isSpam || false;
  const isPillowSpam = reaction.emoji === "sticker-pillow-spam";

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

    // Larger size for pillow spam sticker
    const stickerSize = isPillowSpam ? 200 : 150;

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
                className="object-contain opacity-90"
                style={{ width: `${stickerSize}px`, height: `${stickerSize}px` }}
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
    // Larger size for pillow spam sticker
    const bigStickerSize = isPillowSpam ? 400 : 300;

    return (
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
        {/* Big sticker in center with special animation */}
        <div className="animate-sticker-big">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={emojiData?.label || "sticker"}
              className="object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]"
              style={{ width: `${bigStickerSize}px`, height: `${bigStickerSize}px` }}
            />
          ) : (
            <span className="text-[200px]">{reaction.emoji}</span>
          )}
        </div>
      </div>
    );
  }

  // Otherwise, show sticker animation
  
  // Calculate sender position
  let startX: number;
  let startY: number;

  if (playerIndex !== undefined && playerIndex >= 0) {
    // Get the seat coordinates for sender
    const coords = getSeatCoordinates(playerIndex, totalPlayers, currentUid);
    startX = coords.x + 3;
    startY = coords.y - 10;
  } else if (reaction.x !== undefined && reaction.y !== undefined) {
    startX = reaction.x;
    startY = reaction.y;
  } else {
    startX = Math.random() * 60 + 20; // 20-80%
    startY = Math.random() * 40 + 30; // 30-70%
  }

  // Calculate recipient position if available
  let endX: number | undefined;
  let endY: number | undefined;
  
  if (recipientIndex !== undefined && recipientIndex >= 0 && reaction.toUid) {
    const recipientCoords = getSeatCoordinates(recipientIndex, totalPlayers, currentUid);
    endX = recipientCoords.x + 3;
    endY = recipientCoords.y - 10;
  }

  // Larger size for pillow spam sticker in floating mode
  const floatingStickerSize = isPillowSpam ? 120 : 80;

  // If we have both start and end positions, animate from sender to recipient
  if (endX !== undefined && endY !== undefined) {
    return (
      <div
        className="pointer-events-none absolute z-50 animate-sticker-fly"
        style={{
          left: `${startX}%`,
          top: `${startY}%`,
          '--end-x': `${endX}%`,
          '--end-y': `${endY}%`,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
          width: `${floatingStickerSize}px`,
          height: `${floatingStickerSize}px`,
        } as React.CSSProperties}
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

  // Otherwise, show normal floating animation from sender's position
  const animationType = getEmojiAnimation(reaction.emoji);
  const animationClass = EMOJI_ANIMATIONS[animationType];

  return (
    <div
      className={`pointer-events-none absolute z-50 ${animationClass}`}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        width: `${floatingStickerSize}px`,
        height: `${floatingStickerSize}px`,
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
