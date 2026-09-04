"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Sparkles, Trophy } from "lucide-react";

type CoinParticle = {
  id: number;
  xPercent: number;
  driftPx: number;
  sizePx: number;
  delaySec: number;
  durationSec: number;
  spinDeg: number;
  initialRotDeg: number;
  driftRotDeg: number;
  scale: number;
};

type SparkleParticle = {
  id: number;
  topPercent: number;
  leftPercent: number;
  sizePx: number;
  delaySec: number;
};

export type WinnerCelebrationData = {
  handNumber: number;
  winnerNames: string[];
  totalPot?: number;
  isCurrentUserWinner: boolean;
  wonAmount?: number;
  currency?: string;
};

function GoldCoinSvg({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_4px_10px_rgba(234,179,8,0.55)]"
    >
      <defs>
        {/* Outer Coin Gradient */}
        <linearGradient id={`coin-gold-outer-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#eab308" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        {/* Inner Coin Gradient */}
        <linearGradient id={`coin-gold-inner-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="65%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Specular highlight */}
        <linearGradient id={`coin-shine-${size}`} x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#fef08a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer Coin Base */}
      <circle cx="24" cy="24" r="22" fill={`url(#coin-gold-outer-${size})`} stroke="#fef08a" strokeWidth="1.5" />

      {/* Milled Edge Ribs */}
      <circle cx="24" cy="24" r="19" stroke="#713f12" strokeWidth="0.8" strokeDasharray="2 1.5" fill="none" opacity="0.6" />

      {/* Inner Recessed Face */}
      <circle cx="24" cy="24" r="16.5" fill={`url(#coin-gold-inner-${size})`} stroke="#fde047" strokeWidth="1.2" />

      {/* Embossed Symbol (Star / Crown / Currency) */}
      <path
        d="M24 13L26.5 19.5H33.5L28 23.5L30 30L24 26L18 30L20 23.5L14.5 19.5H21.5L24 13Z"
        fill="#713f12"
        fillOpacity="0.85"
      />
      <path
        d="M24 14L26.2 19.8H32.5L27.6 23.4L29.4 29.2L24 25.6L18.6 29.2L20.4 23.4L15.5 19.8H21.8L24 14Z"
        fill="#fef08a"
      />

      {/* Specular Highlight Overlay */}
      <ellipse cx="20" cy="18" rx="14" ry="9" fill={`url(#coin-shine-${size})`} opacity="0.6" />
    </svg>
  );
}

export function WinnerCelebrationOverlay({
  data,
  onComplete,
}: {
  data: WinnerCelebrationData | null;
  onComplete?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  // Generate 55 randomized coin particles
  const coins = useMemo<CoinParticle[]>(() => {
    if (!data) return [];

    return Array.from({ length: 55 }).map((_, index) => {
      const isForeground = index % 3 === 0;
      const sizePx = isForeground
        ? Math.floor(Math.random() * 10 + 32)
        : Math.floor(Math.random() * 12 + 20);

      return {
        id: index,
        xPercent: Math.random() * 96 + 2, // 2% to 98% across screen
        driftPx: (Math.random() - 0.5) * 120, // -60px to +60px sway
        sizePx,
        delaySec: Math.random() * 1.8, // staggered shower waves
        durationSec: Math.random() * 1.2 + 2.0, // 2.0s to 3.2s fall
        spinDeg: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 540 + 720), // 3D spin
        initialRotDeg: (Math.random() - 0.5) * 60,
        driftRotDeg: (Math.random() - 0.5) * 180,
        scale: isForeground ? 1 : 0.75,
      };
    });
  }, [data]);

  // Generate sparkles
  const sparkles = useMemo<SparkleParticle[]>(() => {
    if (!data) return [];

    return Array.from({ length: 24 }).map((_, index) => ({
      id: index,
      topPercent: Math.random() * 85 + 5,
      leftPercent: Math.random() * 90 + 5,
      sizePx: Math.floor(Math.random() * 16 + 12),
      delaySec: Math.random() * 1.5,
    }));
  }, [data]);

  useEffect(() => {
    if (!data) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, onComplete]);

  if (!data || !isVisible) {
    return null;
  }

  const winnerTitle = data.isCurrentUserWinner
    ? "YOU WON!"
    : `${data.winnerNames.join(", ")} Won!`;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* ─── Golden Aura Full-Screen Ambient Layer ───────────────────────────────── */}
      <div className="chipless-winner-aura absolute inset-0" />

      {/* ─── Rotating Sunburst Rays in Center ───────────────────────────────────── */}
      <div className="chipless-winner-sunburst absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[180vmax] w-[180vmax] rounded-full opacity-35" />

      {/* ─── Screen Edge Golden Vignette Glow ──────────────────────────────────── */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(245,158,11,0.5),inset_0_0_200px_rgba(251,191,36,0.25)]" />

      {/* ─── Floating Star Sparkles ────────────────────────────────────────────── */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="chipless-winner-sparkle absolute text-amber-200"
          style={{
            top: `${sparkle.topPercent}%`,
            left: `${sparkle.leftPercent}%`,
            animationDelay: `${sparkle.delaySec}s`,
            filter: "drop-shadow(0 0 8px rgba(253,224,71,0.95))",
          }}
        >
          <Sparkles style={{ width: sparkle.sizePx, height: sparkle.sizePx }} />
        </div>
      ))}

      {/* ─── 55+ Raining 3D Gold Coins Shower ──────────────────────────────────── */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="chipless-falling-coin absolute top-0"
          style={
            {
              left: `${coin.xPercent}%`,
              "--coin-x": "0px",
              "--coin-drift": `${coin.driftPx}px`,
              "--coin-spin": `${coin.spinDeg}deg`,
              "--coin-rot": `${coin.initialRotDeg}deg`,
              "--coin-drift-rot": `${coin.driftRotDeg}deg`,
              animationDelay: `${coin.delaySec}s`,
              animationDuration: `${coin.durationSec}s`,
              transform: `scale(${coin.scale})`,
            } as React.CSSProperties
          }
        >
          <GoldCoinSvg size={coin.sizePx} />
        </div>
      ))}

      {/* ─── Central Winner Announcement Banner ───────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="chipless-winner-badge relative flex flex-col items-center gap-2 rounded-3xl border-2 border-amber-300/80 bg-black/85 px-8 py-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.7),inset_0_0_30px_rgba(251,191,36,0.35)] backdrop-blur-md">
          {/* Header Icon */}
          <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-black shadow-[0_0_24px_rgba(251,191,36,0.85)]">
            {data.isCurrentUserWinner ? (
              <Crown className="size-8 text-black drop-shadow" />
            ) : (
              <Trophy className="size-8 text-black drop-shadow" />
            )}
          </div>

          {/* Winner Title */}
          <h2 className="font-audiowide text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.8)] sm:text-3xl">
            {winnerTitle}
          </h2>

          {/* Won Amount */}
          {data.wonAmount !== undefined && data.wonAmount > 0 && (
            <div className="mt-1 flex items-baseline gap-1.5 font-bold text-emerald-400 drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]">
              <span className="text-3xl tabular-nums sm:text-4xl">
                +{data.wonAmount.toLocaleString("en-US")}
              </span>
              <span className="text-lg font-semibold text-emerald-300/80">
                {data.currency ?? "THB"}
              </span>
            </div>
          )}

          {/* Pot Subtitle */}
          {data.totalPot !== undefined && data.totalPot > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/65">
              Pot: {data.totalPot.toLocaleString("en-US")} {data.currency ?? "THB"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
