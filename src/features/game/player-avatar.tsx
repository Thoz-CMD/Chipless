import { Crown } from "lucide-react";

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
  isBigBlind,
  isCurrentTurn,
  hasFolded,
}: {
  uid: string;
  name: string;
  photoUrl?: string;
  winStreak?: number;
  isCurrentUser: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  hasFolded?: boolean;
}) {
  const tone = avatarTones[getAvatarIndex(uid) % avatarTones.length];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isOnFire = winStreak >= 2 && !hasFolded;
  const isSingleWin = winStreak === 1 && !hasFolded;

  return (
    <div className="relative flex size-14 items-center justify-center">
      {/* Outer Glow & Fire Ring */}
      <div
        className={`relative flex size-full items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br ${tone} text-xl font-bold text-black transition-all duration-300 ${
          hasFolded
            ? "border-red-500/70 opacity-60 shadow-none ring-0"
            : isOnFire
              ? isCurrentTurn
                ? "animate-fire-glow border-amber-300 shadow-[0_0_32px_rgba(249,115,22,1),0_0_48px_rgba(239,68,68,0.8)] ring-4 ring-amber-300"
                : "animate-fire-glow border-orange-400 ring-2 ring-orange-400/90"
              : isCurrentTurn
                ? "border-yellow-300 shadow-[0_0_26px_rgba(253,224,71,0.8)] ring-4 ring-yellow-300/70"
                : isSingleWin
                  ? "border-amber-400/80 shadow-[0_0_16px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/60"
                  : isCurrentUser
                    ? "border-white shadow-[0_0_18px_rgba(255,255,255,0.18)] ring-2 ring-white/70"
                    : "border-white/45 shadow-[0_0_18px_rgba(255,255,255,0.18)]"
        }`}
      >
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt={name}
            className={`size-full object-cover ${hasFolded ? "opacity-30" : ""}`}
          />
        ) : (
          <span className={hasFolded ? "opacity-20" : "drop-shadow-sm"}>
            {initial}
          </span>
        )}

        {hasFolded ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full border border-red-500/80 bg-black/80 shadow-[0_0_12px_rgba(239,68,68,0.5)] backdrop-blur-[1px]">
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]">
              FOLD
            </span>
          </div>
        ) : null}
      </div>

      {/* Big Blind Crown */}
      {isBigBlind ? (
        <div className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.75)]">
          <Crown className="size-7 fill-yellow-300" aria-label="Big blind" />
        </div>
      ) : null}

      {/* Win Streak "On Fire" Badge */}
      {isOnFire ? (
        <div
          className={`animate-flame-pulse pointer-events-none absolute left-1/2 z-30 flex items-center gap-1 rounded-full border border-amber-300/90 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 px-2 py-0.5 text-[10px] font-black tracking-tight text-white shadow-[0_0_16px_rgba(249,115,22,1)] select-none ${
            isBigBlind ? "-top-9" : "-top-2.5"
          }`}
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
