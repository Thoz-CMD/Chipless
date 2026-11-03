import type { ProfileFrame } from "@/features/game/profile-frames";

const avatarTones = [
  "from-neutral-200 to-neutral-700",
  "from-zinc-100 to-zinc-800",
  "from-stone-200 to-neutral-900",
  "from-white to-zinc-700",
  "from-neutral-300 to-black",
  "from-zinc-300 to-stone-800",
] as const;

function getAvatarIndex(uid: string): number {
  return Array.from(uid).reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);
}

export function PlayerAvatar({
  uid,
  name,
  photoUrl,
  winStreak = 0,
  isCurrentUser,
  isDealer,
  isCurrentTurn,
  hasFolded,
  profileFrame,
  sizeClassName = "size-12",
  hideBadges = false,
}: {
  uid: string;
  name: string;
  photoUrl?: string;
  winStreak?: number;
  isCurrentUser: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  hasFolded?: boolean;
  profileFrame?: ProfileFrame;
  sizeClassName?: string;
  hideBadges?: boolean;
}) {
  const tone = avatarTones[getAvatarIndex(uid) % avatarTones.length];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isOnFire = winStreak >= 2 && !hasFolded;

  // Use custom frame if provided, otherwise use default styling
  const useCustomFrame = profileFrame && profileFrame.id !== "none" && !hasFolded;
  
  const getBorderClass = () => {
    if (hasFolded) return "border-white/20 opacity-50 shadow-none ring-0";
    if (useCustomFrame) return profileFrame.borderStyle;
    if (isOnFire) {
      return isCurrentTurn
        ? "animate-fire-glow border-amber-300 shadow-[0_0_32px_rgba(249,115,22,1),0_0_48px_rgba(239,68,68,0.8)] ring-4 ring-amber-300"
        : "animate-fire-glow border-orange-400 ring-2 ring-orange-400/90";
    }
    if (isCurrentTurn) return "border-yellow-300 shadow-[0_0_26px_rgba(253,224,71,0.8)] ring-4 ring-yellow-300/70";
    if (isCurrentUser) return "border-white shadow-[0_0_18px_rgba(255,255,255,0.18)] ring-2 ring-white/70";
    return "border-white/45 shadow-[0_0_18px_rgba(255,255,255,0.18)]";
  };

  const getGlowClass = () => {
    if (hasFolded) return "";
    if (useCustomFrame) {
      const baseGlow = profileFrame.glowEffect;
      const ringClass = profileFrame.ringStyle || "";
      return `${baseGlow} ${ringClass}`;
    }
    return "";
  };

  const getAnimationClass = () => {
    if (useCustomFrame && profileFrame.pulseAnimation) {
      return "animate-pulse";
    }
    return "";
  };

  return (
    <div className={`relative flex ${sizeClassName} items-center justify-center`}>
      {/* Custom Frame Corner Accents */}
      {useCustomFrame && profileFrame.cornerAccents && (
        <>
          {/* Top-left corner */}
          <div className="pointer-events-none absolute -top-1 -left-1 z-30 size-3 border-l-2 border-t-2" style={{ borderColor: profileFrame.previewColor }} />
          {/* Top-right corner */}
          <div className="pointer-events-none absolute -top-1 -right-1 z-30 size-3 border-r-2 border-t-2" style={{ borderColor: profileFrame.previewColor }} />
          {/* Bottom-left corner */}
          <div className="pointer-events-none absolute -bottom-1 -left-1 z-30 size-3 border-l-2 border-b-2" style={{ borderColor: profileFrame.previewColor }} />
          {/* Bottom-right corner */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 z-30 size-3 border-r-2 border-b-2" style={{ borderColor: profileFrame.previewColor }} />
        </>
      )}

      {/* Outer Glow & Fire Ring */}
      <div
        className={`relative flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${tone} text-lg font-bold text-black transition-all duration-300 ${getBorderClass()} ${getGlowClass()} ${getAnimationClass()}`}
      >
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt={name}
            draggable={false}
            className="size-full object-cover pointer-events-none select-none"
          />
        ) : (
          <span className="drop-shadow-sm">
            {initial}
          </span>
        )}
      </div>

      {/* Dealer Button */}
      {isDealer && !hideBadges ? (
        <div
          className="pointer-events-none absolute -top-2 -right-2 z-20 flex size-7 items-center justify-center rounded-full border-2 border-white bg-white text-[11px] font-black shadow-[0_0_10px_rgba(255,255,255,0.4)] ring-1 ring-black"
          aria-label="Dealer"
        >
          <span
            className="absolute inset-1 rounded-full border border-black/20"
          />
          <span className="relative leading-none tracking-normal text-black">
            D
          </span>
        </div>
      ) : null}

      {/* Win Streak "On Fire" Badge */}
      {isOnFire && !hideBadges ? (
        <div
          className="animate-flame-pulse pointer-events-none absolute -top-4 left-1/2 z-40 flex items-center gap-1 rounded-full border border-amber-300/90 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 px-1.5 py-0.5 text-[9px] font-black tracking-tight text-white shadow-[0_0_16px_rgba(249,115,22,1)] select-none"
        >
          <span>🔥</span>
          <span className="font-extrabold tabular-nums drop-shadow">
            {winStreak}
          </span>
        </div>
      ) : null}
    </div>
  );
}
