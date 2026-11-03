import type { HandCategory } from "@/features/game/logic/hand-evaluator";

const CATEGORY_LABELS: Record<HandCategory, { label: string; gradient: string; glow: string }> = {
  "royal-flush": { label: "Royal Flush", gradient: "from-fuchsia-300 via-amber-200 to-yellow-300", glow: "rgba(232,121,249,0.9)" },
  "straight-flush": { label: "Straight Flush", gradient: "from-emerald-300 via-cyan-200 to-sky-300", glow: "rgba(52,211,153,0.9)" },
  "four-of-a-kind": { label: "Four of a Kind", gradient: "from-violet-300 via-indigo-200 to-blue-300", glow: "rgba(167,139,250,0.9)" },
  "full-house": { label: "Full House", gradient: "from-pink-300 via-rose-200 to-orange-300", glow: "rgba(251,113,133,0.9)" },
  flush: { label: "Flush", gradient: "from-sky-300 via-blue-200 to-cyan-300", glow: "rgba(56,189,248,0.9)" },
  straight: { label: "Straight", gradient: "from-lime-300 via-green-200 to-emerald-300", glow: "rgba(163,230,53,0.9)" },
  "three-of-a-kind": { label: "Three of a Kind", gradient: "from-orange-300 via-amber-200 to-red-300", glow: "rgba(251,146,60,0.9)" },
  "two-pair": { label: "Two Pair", gradient: "from-indigo-300 via-violet-200 to-fuchsia-300", glow: "rgba(129,140,248,0.9)" },
  pair: { label: "One Pair", gradient: "from-rose-300 via-pink-200 to-fuchsia-300", glow: "rgba(244,114,182,0.9)" },
  "high-card": { label: "High Card", gradient: "from-slate-200 via-gray-100 to-zinc-300", glow: "rgba(203,213,225,0.8)" },
};

export function HandCategoryLabel({
  category,
  label,
  hint,
  className = "-top-6 left-1/2 -translate-x-1/2",
}: {
  category: HandCategory;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const style = CATEGORY_LABELS[category];
  return (
    <span
      className={`hand-category-label pointer-events-none absolute z-20 whitespace-nowrap bg-gradient-to-r ${style.gradient} bg-clip-text text-lg leading-tight font-black tracking-wide text-transparent sm:text-xl ${className}`}
      style={{ filter: `drop-shadow(0 2px 5px rgba(0,0,0,1)) drop-shadow(0 0 10px ${style.glow})` }}
    >
      <span className="flex items-center gap-1">
        <span>{label ?? style.label}</span>
        {hint ? <span className="tracking-normal text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">{hint}</span> : null}
      </span>
    </span>
  );
}
