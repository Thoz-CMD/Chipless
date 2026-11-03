"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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

function SwipeableSpamSticker({
  position,
  imageSrc,
  label,
  emoji,
  stickerSize,
}: {
  position: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    delay: number;
    rotation: number;
    scale: number;
  };
  imageSrc?: string;
  label: string;
  emoji: string;
  stickerSize: number;
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSwipingAway) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || isSwipingAway) return;

    setOffset({ x: event.clientX - start.x, y: event.clientY - start.y });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const delta = {
      x: event.clientX - start.x,
      y: event.clientY - start.y,
    };
    const distance = Math.hypot(delta.x, delta.y);

    if (distance < 48) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const exitDistance = Math.max(window.innerWidth, window.innerHeight) * 1.25;
    setIsSwipingAway(true);
    setOffset({
      x: delta.x + (delta.x / distance) * exitDistance,
      y: delta.y + (delta.y / distance) * exitDistance,
    });
    window.setTimeout(() => setIsDismissed(true), 240);
  };

  if (isDismissed) return null;

  return (
    <div
      className="pointer-events-auto absolute animate-sticker-spam"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.startX}%`,
        top: `${position.startY}%`,
        animationDelay: `${position.delay}s`,
        transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(${position.scale})`,
        translate: `${offset.x}px ${offset.y}px`,
        transition: isSwipingAway
          ? "translate 240ms cubic-bezier(0.22, 1, 0.36, 1)"
          : "translate 80ms ease-out",
        '--start-x': `${position.startX}%`,
        '--start-y': `${position.startY}%`,
        '--end-x': `${position.endX}%`,
        '--end-y': `${position.endY}%`,
        touchAction: "none",
      } as React.CSSProperties}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={label}
          className="object-contain opacity-90"
          style={{ width: `${stickerSize}px`, height: `${stickerSize}px` }}
        />
      ) : (
        <span className="text-[100px]">{emoji}</span>
      )}
    </div>
  );
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
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSwipeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSwipingAway) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSwipeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || isSwipingAway) return;

    setSwipeOffset({
      x: event.clientX - start.x,
      y: event.clientY - start.y,
    });
  };

  const handleSwipeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const offset = {
      x: event.clientX - start.x,
      y: event.clientY - start.y,
    };
    const distance = Math.hypot(offset.x, offset.y);

    if (distance < 48) {
      setSwipeOffset({ x: 0, y: 0 });
      return;
    }

    const exitDistance = Math.max(window.innerWidth, window.innerHeight) * 1.25;
    setIsSwipingAway(true);
    setSwipeOffset({
      x: offset.x + (offset.x / distance) * exitDistance,
      y: offset.y + (offset.y / distance) * exitDistance,
    });
    window.setTimeout(() => onComplete(reaction.id), 240);
  };

  const swipeHandlers = {
    onPointerDown: handleSwipeStart,
    onPointerMove: handleSwipeMove,
    onPointerUp: handleSwipeEnd,
  };

  const swipeStyle = {
    translate: `${swipeOffset.x}px ${swipeOffset.y}px`,
    transition: isSwipingAway
      ? "translate 240ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "translate 80ms ease-out",
    touchAction: "none" as const,
  };

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
          <SwipeableSpamSticker
            key={`${reaction.id}-spam-${idx}`}
            position={pos}
            imageSrc={imageSrc}
            label={emojiData?.label || "spam sticker"}
            emoji={reaction.emoji}
            stickerSize={stickerSize}
          />
        ))}
      </div>
    );
  }

  // NORMAL STICKER - big in center
  if (isForCurrentUser) {
    // Larger size for pillow spam sticker
    const bigStickerSize = isPillowSpam ? 400 : 300;

    return (
      <div
        className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center"
        {...swipeHandlers}
        style={swipeStyle}
      >
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
        className="pointer-events-auto absolute z-50 animate-sticker-fly"
        {...swipeHandlers}
        style={{
          left: `${startX}%`,
          top: `${startY}%`,
          '--end-x': `${endX}%`,
          '--end-y': `${endY}%`,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
          width: `${floatingStickerSize}px`,
          height: `${floatingStickerSize}px`,
          ...swipeStyle,
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
      className={`pointer-events-auto absolute z-50 ${animationClass}`}
      {...swipeHandlers}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        width: `${floatingStickerSize}px`,
        height: `${floatingStickerSize}px`,
        ...swipeStyle,
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
