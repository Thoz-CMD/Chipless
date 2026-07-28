const cards = ["10", "J", "Q", "K", "A"] as const;

export function CommunityCards() {
  return (
    <div className="flex justify-center gap-1.5">
      {cards.map((card) => (
        <div
          key={card}
          className="flex h-14 w-9 items-center justify-center rounded border border-white/45 bg-black/80 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]"
        >
          <span className="text-lg leading-none font-bold">{card}</span>
        </div>
      ))}
    </div>
  );
}
