export type HandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush"
  | "royal-flush";

export type EvaluatedHand = {
  category: HandCategory;
  categoryRank: number;
  tiebreak: readonly number[];
  cards: readonly string[];
};

const rankValues: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const categoryRanks: Record<HandCategory, number> = {
  "high-card": 0,
  pair: 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8,
  "royal-flush": 9,
};

type ParsedCard = {
  value: number;
  suit: string;
  source: string;
};

function parseCard(card: string): ParsedCard {
  const [rank, suit] = card.split("-");
  const value = rankValues[rank ?? ""];

  if (!suit || value === undefined) {
    throw new Error(`Invalid card: ${card}`);
  }

  return { value, suit, source: card };
}

function getStraightHigh(values: readonly number[]): number | null {
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);

  if (uniqueValues.includes(14)) {
    uniqueValues.push(1);
  }

  for (let index = 0; index <= uniqueValues.length - 5; index += 1) {
    const window = uniqueValues.slice(index, index + 5);
    if (window[0] - window[4] === 4 && new Set(window).size === 5) {
      return window[0];
    }
  }

  return null;
}

function evaluateFiveCards(cards: readonly string[]): EvaluatedHand {
  const parsed = cards.map(parseCard);
  const values = parsed.map((card) => card.value);
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort(
    (first, second) => second[1] - first[1] || second[0] - first[0],
  );
  const flush = parsed.every((card) => card.suit === parsed[0].suit);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh !== null) {
    const isRoyalFlush =
      straightHigh === 14 &&
      [10, 11, 12, 13, 14].every((value) => values.includes(value));
    return {
      category: isRoyalFlush ? "royal-flush" : "straight-flush",
      categoryRank: categoryRanks[isRoyalFlush ? "royal-flush" : "straight-flush"],
      tiebreak: [straightHigh],
      cards,
    };
  }

  if (groups[0]?.[1] === 4) {
    return {
      category: "four-of-a-kind",
      categoryRank: categoryRanks["four-of-a-kind"],
      tiebreak: [groups[0][0], groups[1][0]],
      cards,
    };
  }

  if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    return {
      category: "full-house",
      categoryRank: categoryRanks["full-house"],
      tiebreak: [groups[0][0], groups[1][0]],
      cards,
    };
  }

  if (flush) {
    return {
      category: "flush",
      categoryRank: categoryRanks.flush,
      tiebreak: [...values].sort((a, b) => b - a),
      cards,
    };
  }

  if (straightHigh !== null) {
    return {
      category: "straight",
      categoryRank: categoryRanks.straight,
      tiebreak: [straightHigh],
      cards,
    };
  }

  if (groups[0]?.[1] === 3) {
    return {
      category: "three-of-a-kind",
      categoryRank: categoryRanks["three-of-a-kind"],
      tiebreak: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((a, b) => b - a),
      ],
      cards,
    };
  }

  if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    return {
      category: "two-pair",
      categoryRank: categoryRanks["two-pair"],
      tiebreak: [groups[0][0], groups[1][0], groups[2][0]],
      cards,
    };
  }

  if (groups[0]?.[1] === 2) {
    return {
      category: "pair",
      categoryRank: categoryRanks.pair,
      tiebreak: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((a, b) => b - a),
      ],
      cards,
    };
  }

  return {
    category: "high-card",
    categoryRank: categoryRanks["high-card"],
    tiebreak: [...values].sort((a, b) => b - a),
    cards,
  };
}

function combinations(cards: readonly string[], size: number): string[][] {
  const result: string[][] = [];

  function visit(start: number, current: string[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (
      let index = start;
      index <= cards.length - (size - current.length);
      index += 1
    ) {
      current.push(cards[index]);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);
  return result;
}

export function compareHands(
  first: EvaluatedHand,
  second: EvaluatedHand,
): number {
  if (first.categoryRank !== second.categoryRank) {
    return first.categoryRank - second.categoryRank;
  }

  for (
    let index = 0;
    index < Math.max(first.tiebreak.length, second.tiebreak.length);
    index += 1
  ) {
    const difference =
      (first.tiebreak[index] ?? 0) - (second.tiebreak[index] ?? 0);
    if (difference !== 0) return difference;
  }

  return 0;
}

export function evaluateBestHand(cards: readonly string[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("Texas Hold'em hand evaluation requires 5-7 cards.");
  }

  return combinations(cards, 5)
    .map((combination) => evaluateFiveCards(combination))
    .sort((first, second) => compareHands(second, first))[0];
}

export function getMadeHandCards(hand: EvaluatedHand): readonly string[] {
  if (hand.category === "high-card") return [];

  if (
    hand.category === "straight" ||
    hand.category === "flush" ||
    hand.category === "straight-flush" ||
    hand.category === "royal-flush"
  ) {
    return hand.cards;
  }

  const madeRanks =
    hand.category === "pair" ||
    hand.category === "three-of-a-kind" ||
    hand.category === "four-of-a-kind"
      ? [hand.tiebreak[0]]
      : hand.category === "two-pair" || hand.category === "full-house"
        ? hand.tiebreak.slice(0, 2)
        : [];

  return hand.cards.filter((card) => {
    const rank = card.split("-")[0] ?? "";
    return madeRanks.includes(rankValues[rank]);
  });
}

export function getStraightDrawCards(cards: readonly string[]): readonly string[] {
  const valuesByCard = cards.map((card) => {
    const rank = card.split("-")[0] ?? "";
    return { card, value: rankValues[rank] };
  });
  const availableValues = new Set(
    valuesByCard.flatMap(({ value }) =>
      value === 14 ? [14, 1] : value === undefined ? [] : [value],
    ),
  );
  const drawValues = new Set<number>();

  for (let start = 1; start <= 10; start += 1) {
    const sequence = Array.from({ length: 5 }, (_, index) => start + index);
    const presentValues = sequence.filter((value) => availableValues.has(value));
    if (presentValues.length === 4) {
      presentValues.forEach((value) => drawValues.add(value));
    }
  }

  const selectedRanks = new Set<number>();
  return valuesByCard
    .filter(({ value }) => {
      if (value === undefined) return false;
      const drawRank = value === 14 && drawValues.has(1) ? 1 : value;
      if (!drawValues.has(drawRank) || selectedRanks.has(drawRank)) return false;
      selectedRanks.add(drawRank);
      return true;
    })
    .map(({ card }) => card);
}

export function getStraightDrawOutRanks(cards: readonly string[]): readonly string[] {
  const values = new Set(
    cards.flatMap((card) => {
      const rank = card.split("-")[0] ?? "";
      const value = rankValues[rank];
      return value === 14 ? [14, 1] : value === undefined ? [] : [value];
    }),
  );
  const outs = new Set<number>();

  for (let start = 1; start <= 10; start += 1) {
    const sequence = Array.from({ length: 5 }, (_, index) => start + index);
    const missing = sequence.filter((value) => !values.has(value));
    if (missing.length === 1) {
      const out = missing[0];
      if (out !== undefined) outs.add(out);
    }
  }

  return [...outs].sort((first, second) => first - second).map((value) => {
    if (value === 1 || value === 14) return "A";
    const rank = Object.entries(rankValues).find(([, rankValue]) => rankValue === value)?.[0];
    return rank === "T" ? "10" : rank ?? String(value);
  });
}
