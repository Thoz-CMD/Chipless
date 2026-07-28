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
  isCurrentUser,
  isBigBlind,
  isCurrentTurn,
}: {
  uid: string;
  name: string;
  isCurrentUser: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
}) {
  const tone = avatarTones[getAvatarIndex(uid) % avatarTones.length];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`relative flex size-14 items-center justify-center rounded-full border bg-gradient-to-br ${tone} text-xl font-bold text-black ${
        isCurrentTurn
          ? "border-yellow-300 shadow-[0_0_26px_rgba(253,224,71,0.8)] ring-4 ring-yellow-300/70"
          : isCurrentUser
            ? "border-white shadow-[0_0_18px_rgba(255,255,255,0.18)] ring-2 ring-white/70"
            : "border-white/45 shadow-[0_0_18px_rgba(255,255,255,0.18)]"
      }`}
    >
      {isBigBlind ? (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.75)]">
          <Crown className="size-7 fill-yellow-300" aria-label="Big blind" />
        </div>
      ) : null}
      <span className="drop-shadow-sm">{initial}</span>
    </div>
  );
}
