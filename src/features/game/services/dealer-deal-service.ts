import { getFirebaseAuth } from "@/lib/firebase/client";
import type { PlayerCardsByUid } from "@/features/game/logic/texas-holdem";

export type DealerDealResult = {
  playerCards: PlayerCardsByUid;
  deckToken: string;
  remainingCardCount: number;
};

function isPlayerCardsByUid(value: unknown): value is PlayerCardsByUid {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every(
    (cards) =>
      Array.isArray(cards) && cards.every((card) => typeof card === "string"),
  );
}

export async function dealDealerHand(
  roomId: string,
): Promise<DealerDealResult> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Please sign in before dealing cards.");
  }

  const response = await fetch("/api/dealer/deal-hand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      uid: user.uid,
      idToken: await user.getIdToken(),
    }),
  });
  const responseValue: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      responseValue &&
      typeof responseValue === "object" &&
      typeof (responseValue as Record<string, unknown>).error === "string"
        ? (responseValue as Record<string, string>).error
        : "Unable to deal cards.";
    throw new Error(errorMessage);
  }

  if (
    !responseValue ||
    typeof responseValue !== "object" ||
    !isPlayerCardsByUid(
      (responseValue as Record<string, unknown>).playerCards,
    ) ||
    typeof (responseValue as Record<string, unknown>).deckToken !== "string" ||
    typeof (responseValue as Record<string, unknown>).remainingCardCount !==
      "number"
  ) {
    throw new Error("Dealer returned an invalid deal.");
  }

  const deal = responseValue as Record<string, unknown>;

  return {
    playerCards: deal.playerCards as PlayerCardsByUid,
    deckToken: deal.deckToken as string,
    remainingCardCount: deal.remainingCardCount as number,
  };
}
