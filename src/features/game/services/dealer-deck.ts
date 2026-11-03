import {
  createCipheriv,
  createHash,
  createDecipheriv,
  randomBytes,
  randomInt,
} from "node:crypto";

export const CARD_SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const CARD_RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
] as const;

export type CardSuit = (typeof CARD_SUITS)[number];
export type CardRank = (typeof CARD_RANKS)[number];
export type Card = `${CardRank}-${CardSuit}`;

export type DealerDeal = {
  playerCards: Record<string, readonly [Card, Card]>;
  remainingDeck: readonly Card[];
};

type DealerDeckTokenPayload = {
  remainingDeck: readonly Card[];
  createdAt: number;
};

export type DealerReveal = {
  communityCards: Card[];
  remainingDeck: Card[];
};

export function createStandardDeck(): Card[] {
  return CARD_SUITS.flatMap((suit) =>
    CARD_RANKS.map((rank) => `${rank}-${suit}` as Card),
  );
}

export function shuffleDeck(deck: readonly Card[]): Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function dealHoleCards(playerUids: readonly string[]): DealerDeal {
  const deck = shuffleDeck(createStandardDeck());
  const playerCards = Object.fromEntries(
    playerUids.map((uid) => [uid, [] as Card[]]),
  ) as Record<string, Card[]>;

  let deckIndex = 0;
  for (let cardRound = 0; cardRound < 2; cardRound += 1) {
    for (const uid of playerUids) {
      playerCards[uid].push(deck[deckIndex]);
      deckIndex += 1;
    }
  }

  return {
    playerCards: playerUids.reduce<Record<string, readonly [Card, Card]>>(
      (cards, uid) => {
        cards[uid] = [playerCards[uid][0], playerCards[uid][1]];
        return cards;
      },
      {},
    ),
    remainingDeck: deck.slice(deckIndex),
  };
}

function getDeckTokenKey(): Buffer {
  const secret = process.env.DEALER_DECK_SECRET;

  if (!secret) {
    throw new Error("DEALER_DECK_SECRET is not configured.");
  }

  return createHash("sha256").update(secret).digest();
}

export function createDealerDeckToken(deck: readonly Card[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getDeckTokenKey(), iv);
  const payload: DealerDeckTokenPayload = {
    remainingDeck: deck,
    createdAt: Date.now(),
  };
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}

export function revealCommunityCards(
  token: string,
  count: number,
): DealerReveal {
  const [ivValue, authTagValue, encryptedValue] = token.split(".");

  if (!ivValue || !authTagValue || !encryptedValue || count < 1) {
    throw new Error("Invalid dealer deck token.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getDeckTokenKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  const payload = JSON.parse(
    decrypted.toString("utf8"),
  ) as DealerDeckTokenPayload;

  if (
    !Array.isArray(payload.remainingDeck) ||
    payload.remainingDeck.length < count + 1 ||
    typeof payload.createdAt !== "number"
  ) {
    throw new Error("Dealer deck is invalid or exhausted.");
  }

  return {
    communityCards: payload.remainingDeck.slice(1, count + 1),
    remainingDeck: payload.remainingDeck.slice(count + 1),
  };
}
