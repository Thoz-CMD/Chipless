import type { BettingRound } from "@/features/game/logic/texas-holdem";
import { CARD_THEMES, DEFAULT_CARD_ID } from "@/features/game/table-skins";
import type { CardTheme } from "@/features/game/table-skins";
import { PlayingCardFace } from "@/features/game/playing-card-face";

const cardSlots = [0, 1, 2, 3, 4] as const;

export function CommunityCards({
  bettingRound,
  communityCards = [],
  cardTheme,
  highlightedCards = [],
}: {
  bettingRound?: BettingRound;
  communityCards?: readonly string[];
  cardTheme?: CardTheme;
  highlightedCards?: readonly string[];
}) {
  const active: CardTheme = cardTheme ?? CARD_THEMES[DEFAULT_CARD_ID];
  const revealedCount =
    bettingRound === "flop"
      ? 3
      : bettingRound === "turn"
        ? 4
        : bettingRound === "river" || bettingRound === "showdown" || bettingRound === "summary"
          ? 5
          : 0;

  return (
    <div className="flex justify-center gap-1.5">
      {cardSlots.map((slot, index) => {
        const isRevealed = index < revealedCount;
        const card = communityCards[index];
        if (isRevealed && card) {
          return <PlayingCardFace key={`community-card-slot-${slot}`} card={card} hand table highlighted={highlightedCards.includes(card)} />;
        }

        return (
          <div
            key={`community-card-slot-${slot}`}
            className="h-14 w-9 shrink-0 rounded transition-all duration-300"
            style={{
              background: active.backBg,
              border: `1px solid ${active.backBorder}`,
              backgroundImage: active.backPattern,
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.06)",
            }}
          />
        );
      })}
    </div>
  );
}
