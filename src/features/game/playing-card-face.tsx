type SuitName = "hearts" | "diamonds" | "clubs" | "spades";

const SUITS: Record<SuitName, { symbol: string; red: boolean }> = {
  hearts: { symbol: "♥", red: true },
  diamonds: { symbol: "♦", red: true },
  clubs: { symbol: "♣", red: false },
  spades: { symbol: "♠", red: false },
};

function parseCard(card: string) {
  const [rank, suitName] = card.split("-");
  const suit = SUITS[suitName as SuitName] ?? SUITS.spades;
  return { rank: rank === "T" ? "10" : rank ?? "?", ...suit };
}

type PlayingCardFaceProps = {
  card: string;
  compact?: boolean;
  hand?: boolean;
  table?: boolean;
  showdown?: boolean;
  highlighted?: boolean;
};

export function PlayingCardFace({
  card,
  compact = false,
  hand = false,
  table = false,
  showdown = false,
  highlighted = false,
}: PlayingCardFaceProps) {
  const { rank, symbol, red } = parseCard(card);
  const dimensions = showdown
    ? "h-11 w-8"
    : hand && !table
      ? "h-16 w-12"
      : compact
        ? "h-7 w-6"
        : "h-14 w-9";

  return (
    <span
      className={`relative block shrink-0 overflow-visible ${dimensions} ${highlighted ? "z-10" : ""}`}
      aria-label={`${rank} ${symbol}`}
    >
      {highlighted ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 z-0 rounded-[0.3em] bg-gradient-to-br from-pink-600 via-rose-800 to-purple-950"
          style={{
            boxShadow:
              "0 0 5px 2px rgba(236,72,153,0.25), 0 0 7px 1px rgba(126,34,206,0.18)",
          }}
        />
      ) : null}
      <span
        className={`relative z-10 block size-full overflow-hidden rounded-[0.22em] border border-black/10 bg-white font-black ${hand ? "shadow-[0_2px_8px_rgba(0,0,0,0.45)]" : "shadow-[0_2px_8px_rgba(0,0,0,0.35)]"} ${red ? "text-red-600" : "text-black"}`}
      >
        <span
          className={`absolute left-[12%] top-[5%] flex flex-col items-center leading-[0.82] ${hand ? "text-[17px]" : showdown ? "text-[11px]" : compact ? "text-[8px]" : "text-[13px]"}`}
        >
          <span>{rank}</span>
          {!hand && !showdown ? (
            <span className={compact ? "text-[7px]" : "text-[10px]"}>
              {symbol}
            </span>
          ) : null}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center pt-[12%] leading-none ${hand ? "text-[48px]" : showdown ? "text-[28px]" : compact ? "text-[20px]" : "text-[44px]"}`}
        >
          {symbol}
        </span>
      </span>
    </span>
  );
}
