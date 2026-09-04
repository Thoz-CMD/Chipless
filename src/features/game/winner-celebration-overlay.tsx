"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Sparkles } from "lucide-react";

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

function CoinGraphic({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_4px_12px_rgba(245,158,11,0.7)]"
    >
      {/* Outer Coin Base with gold gradient */}
      <circle cx="24" cy="24" r="22" fill="url(#global-coin-gold-outer)" stroke="#fef08a" strokeWidth="1.5" />

      {/* Milled Edge Ribs */}
      <circle cx="24" cy="24" r="19" stroke="#713f12" strokeWidth="0.8" strokeDasharray="2 1.5" fill="none" opacity="0.6" />

      {/* Inner Recessed Face */}
      <circle cx="24" cy="24" r="16" fill="url(#global-coin-gold-inner)" stroke="#fde047" strokeWidth="1.2" />

      {/* Embossed Gold Star Symbol */}
      <path
        d="M24 13.5L26.2 19.2H32.5L27.6 22.8L29.4 28.5L24 25L18.6 28.5L20.4 22.8L15.5 19.2H21.8L24 13.5Z"
        fill="#713f12"
        fillOpacity="0.8"
      />
      <path
        d="M24 14.5L25.8 19.2H31.5L27.2 22.4L28.8 27.2L24 24.2L19.2 27.2L20.8 22.4L16.5 19.2H22.2L24 14.5Z"
        fill="#fef08a"
      />

      {/* Specular Light Reflection */}
      <ellipse cx="20" cy="18" rx="13" ry="8" fill="url(#global-coin-shine)" opacity="0.6" />
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

  // Generate 65 randomized coin particles for rich waterfall shower
  const coins = useMemo<CoinParticle[]>(() => {
    if (!data) return [];

    return Array.from({ length: 65 }).map((_, index) => {
      const isForeground = index % 3 === 0;
      const sizePx = isForeground
        ? Math.floor(Math.random() * 10 + 32)
        : Math.floor(Math.random() * 12 + 20);

      return {
        id: index,
        xPercent: Math.random() * 94 + 3, // 3% to 97% across screen width
        driftPx: (Math.random() - 0.5) * 140,
        sizePx,
        delaySec: Math.random() * 2.0, // spread over 2 seconds
        durationSec: Math.random() * 1.0 + 2.0, // 2.0s to 3.0s fall
        spinDeg: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 540 + 720),
        initialRotDeg: (Math.random() - 0.5) * 60,
        driftRotDeg: (Math.random() - 0.5) * 180,
        scale: isForeground ? 1 : 0.75,
      };
    });
  }, [data]);

  // Generate sparkles
  const sparkles = useMemo<SparkleParticle[]>(() => {
    if (!data) return [];

    return Array.from({ length: 28 }).map((_, index) => ({
      id: index,
      topPercent: Math.random() * 85 + 5,
      leftPercent: Math.random() * 90 + 5,
      sizePx: Math.floor(Math.random() * 16 + 14),
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
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, onComplete]);

  if (!data || !isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* ─── Shared SVG Gradients Defs ────────────────────────────────────────── */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="global-coin-gold-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
          <linearGradient id="global-coin-gold-inner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="global-coin-shine" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ─── Golden Aura Full-Screen Ambient Layer ───────────────────────────────── */}
      <div className="chipless-winner-aura absolute inset-0" />

      {/* ─── Rotating Sunburst Rays in Center ───────────────────────────────────── */}
      <div className="chipless-winner-sunburst absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[180vmax] w-[180vmax] rounded-full opacity-40" />

      {/* ─── Screen Edge Golden Vignette Glow ──────────────────────────────────── */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(245,158,11,0.55),inset_0_0_220px_rgba(251,191,36,0.3)]" />

      {/* ─── Floating Star Sparkles ────────────────────────────────────────────── */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="chipless-winner-sparkle absolute text-yellow-200"
          style={{
            top: `${sparkle.topPercent}%`,
            left: `${sparkle.leftPercent}%`,
            animationDelay: `${sparkle.delaySec}s`,
            filter: "drop-shadow(0 0 10px rgba(253,224,71,1))",
          }}
        >
          <Sparkles style={{ width: sparkle.sizePx, height: sparkle.sizePx }} />
        </div>
      ))}

      {/* ─── 65+ Raining 3D Gold Coins Shower ──────────────────────────────────── */}
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
          <CoinGraphic size={coin.sizePx} />
        </div>
      ))}

      {/* ─── Central Winner Announcement Banner ───────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="chipless-winner-badge relative flex flex-col items-center gap-2 rounded-3xl border-2 border-yellow-300/80 bg-black/90 px-8 py-6 text-center shadow-[0_0_70px_rgba(245,158,11,0.8),inset_0_0_30px_rgba(251,191,36,0.4)] backdrop-blur-md">
          {/* Crown Icon */}
          <div className="flex size-14 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-black shadow-[0_0_28px_rgba(251,191,36,0.9)]">
            <Crown className="size-8 text-black drop-shadow" />
          </div>

          {/* Winner Title */}
          <h2 className="font-audiowide text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-300 to-amber-400 drop-shadow-[0_2px_14px_rgba(245,158,11,0.9)] sm:text-4xl">
            YOU WON!
          </h2>

          {/* Won Amount */}
          {data.wonAmount !== undefined && data.wonAmount > 0 && (
            <div className="mt-1 flex items-baseline gap-1.5 font-bold text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.9)]">
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
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/70">
              Pot: {data.totalPot.toLocaleString("en-US")} {data.currency ?? "THB"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
