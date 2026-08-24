import type { BettingRound } from "@/features/game/logic/texas-holdem";

const cards = ["10", "J", "Q", "K", "A"] as const;

export function CommunityCards({ bettingRound }: { bettingRound?: BettingRound }) {
  // Determine how many cards should be revealed based on betting round
  const revealedCount = 
    bettingRound === "flop" ? 3 :
    bettingRound === "turn" ? 4 :
    bettingRound === "river" || bettingRound === "showdown" ? 5 :
    0;

  return (
    <div className="flex justify-center gap-1.5">
      {cards.map((card, index) => {
        const isRevealed = index < revealedCount;
        return (
          <div
            key={card}
            className={`flex h-14 w-9 items-center justify-center rounded border transition-all duration-300 ${
              isRevealed
                ? "border-black bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                : "border-white/45 bg-black/80 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]"
            }`}
          >
            <span className="text-lg leading-none font-bold">{card}</span>
          </div>
        );
      })}
    </div>
  );
}
