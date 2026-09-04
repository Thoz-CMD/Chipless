import type { BettingRound } from "@/features/game/logic/texas-holdem";
import { CARD_THEMES, DEFAULT_CARD_ID } from "@/features/game/table-skins";
import type { CardTheme } from "@/features/game/table-skins";

const cards = ["10", "J", "Q", "K", "A"] as const;

export function CommunityCards({
  bettingRound,
  cardTheme,
}: {
  bettingRound?: BettingRound;
  cardTheme?: CardTheme;
}) {
  const active: CardTheme = cardTheme ?? CARD_THEMES[DEFAULT_CARD_ID];

  const revealedCount =
    bettingRound === "flop"
      ? 3
      : bettingRound === "turn"
        ? 4
        : bettingRound === "river" || bettingRound === "showdown"
          ? 5
          : 0;

  return (
    <div className="flex justify-center gap-1.5">
      {cards.map((card, index) => {
        const isRevealed = index < revealedCount;
        return (
          <div
            key={card}
            className="flex h-14 w-9 items-center justify-center rounded transition-all duration-300"
            style={
              isRevealed
                ? {
                    background: active.frontBg,
                    border: `1px solid ${active.frontBorder}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                    color: active.frontText,
                  }
                : {
                    background: active.backBg,
                    border: `1px solid ${active.backBorder}`,
                    backgroundImage: active.backPattern,
                    boxShadow: "inset 0 0 12px rgba(255,255,255,0.06)",
                    color: "transparent",
                  }
            }
          >
            {isRevealed && (
              <span className="text-lg leading-none font-bold">{card}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
