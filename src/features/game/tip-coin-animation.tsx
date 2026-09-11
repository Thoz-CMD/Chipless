"use client";

import { useEffect, useState } from "react";

type TipCoinAnimationProps = {
  id: string;
  fromPlayerIndex: number;
  toPlayerIndex: number;
  totalPlayers: number;
  amount: number;
  onComplete: (id: string) => void;
};

export function TipCoinAnimation({
  id,
  fromPlayerIndex,
  toPlayerIndex,
  totalPlayers,
  amount,
  onComplete,
}: TipCoinAnimationProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete(id);
    }, 1500); // Match animation duration

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  if (isComplete) return null;

  // Calculate positions based on player indices (same logic as emoji)
  const calculatePosition = (playerIndex: number) => {
    const angle = (playerIndex / totalPlayers) * 2 * Math.PI - Math.PI / 2;
    const radius = 35; // percentage from center
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x, y };
  };

  const fromPos = calculatePosition(fromPlayerIndex);
  const toPos = calculatePosition(toPlayerIndex);

  return (
    <>
      {/* Multiple coins for effect */}
      {[0, 1, 2].map((coinIndex) => (
        <div
          key={`${id}-${coinIndex}`}
          className="pointer-events-none absolute text-3xl animate-tip-coin z-40"
          style={{
            left: `${fromPos.x}%`,
            top: `${fromPos.y}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${coinIndex * 0.1}s`,
            "--from-x": `${fromPos.x}%`,
            "--from-y": `${fromPos.y}%`,
            "--to-x": `${toPos.x}%`,
            "--to-y": `${toPos.y}%`,
          } as React.CSSProperties}
        >
          🪙
        </div>
      ))}

      {/* Amount text following the coins */}
      <div
        className="pointer-events-none absolute animate-tip-amount text-lg font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] z-40"
        style={{
          left: `${fromPos.x}%`,
          top: `${fromPos.y}%`,
          transform: "translate(-50%, -50%)",
          animationDelay: "0.15s",
          "--from-x": `${fromPos.x}%`,
          "--from-y": `${fromPos.y}%`,
          "--to-x": `${toPos.x}%`,
          "--to-y": `${toPos.y}%`,
        } as React.CSSProperties}
      >
        +{amount}
      </div>
    </>
  );
}
