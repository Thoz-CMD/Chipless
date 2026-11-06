import { NextResponse } from "next/server";

import {
  createDealerDeckToken,
  revealCommunityCards,
} from "@/features/game/services/dealer-deck";
import {
  getFirebaseAdminDatabase,
  verifyFirebaseIdToken,
} from "@/lib/firebase/admin";
import { isHoldemGameState } from "@/features/game/logic/texas-holdem";

export const runtime = "nodejs";

type RevealStreetPayload = { roomId: string; idToken: string };

function isPayload(value: unknown): value is RevealStreetPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.roomId === "string" &&
    payload.roomId.length > 0 &&
    typeof payload.idToken === "string" &&
    payload.idToken.length > 0
  );
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  if (!isPayload(payload)) {
    return NextResponse.json(
      { error: "Room ID and ID token are required." },
      { status: 400 },
    );
  }

  try {
    const auth = await verifyFirebaseIdToken(payload.idToken);
    const database = getFirebaseAdminDatabase();
    const roomRef = database.ref(`rooms/${payload.roomId}`);
    const roomSnapshot = await roomRef.once("value");
    const room = roomSnapshot.val() as Record<string, unknown> | null;
    const settings = room?.settings as Record<string, unknown> | undefined;
    const gameState = room?.gameState as Record<string, unknown> | undefined;
    const hand = gameState?.hand;

    if (room?.hostUid !== auth.uid) {
      return NextResponse.json(
        { error: "Only the host can reveal cards." },
        { status: 403 },
      );
    }
    if (settings?.roomMode !== "dealer" || !isHoldemGameState(hand)) {
      return NextResponse.json(
        { error: "Dealer hand is not available." },
        { status: 409 },
      );
    }
    const currentCommunityCards = hand.communityCards ?? [];
    const expectedCardCount =
      hand.bettingRound === "flop"
        ? 0
        : hand.bettingRound === "turn"
          ? 3
          : hand.bettingRound === "river"
            ? 4
            : -1;

    if (
      expectedCardCount < 0 ||
      currentCommunityCards.length !== expectedCardCount
    ) {
      return NextResponse.json(
        { error: "This street cannot be revealed in the current state." },
        { status: 409 },
      );
    }

    const handNumber =
      typeof gameState?.handNumber === "number" ? gameState.handNumber : 1;
    const deckRef = database.ref(
      `dealerHands/${payload.roomId}/${handNumber}/deckToken`,
    );
    const deckSnapshot = await deckRef.once("value");
    const deckToken = deckSnapshot.val();
    if (typeof deckToken !== "string") {
      return NextResponse.json(
        { error: "Dealer deck is not available." },
        { status: 409 },
      );
    }

    const revealCount = expectedCardCount === 0 ? 3 : 1;
    const reveal = revealCommunityCards(deckToken, revealCount);
    const nextHand = {
      ...hand,
      communityCards: [...currentCommunityCards, ...reveal.communityCards],
    };
    await database.ref().update({
      [`rooms/${payload.roomId}/gameState/hand`]: nextHand,
      [`rooms/${payload.roomId}/updatedAt`]: Date.now(),
      [`dealerHands/${payload.roomId}/${handNumber}/deckToken`]:
        createDealerDeckToken(reveal.remainingDeck),
    });

    return NextResponse.json({
      ok: true,
      communityCards: nextHand.communityCards,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to reveal flop.",
      },
      { status: 500 },
    );
  }
}
