import { NextResponse } from "next/server";

import { createHoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  createDealerDeckToken,
  dealHoleCards,
} from "@/features/game/services/dealer-deck";
import {
  getFirebaseAdminDatabase,
  verifyFirebaseIdToken,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

type StartGamePayload = {
  roomId: string;
  idToken: string;
};

function isStartGamePayload(value: unknown): value is StartGamePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.roomId === "string" &&
    payload.roomId.trim().length > 0 &&
    typeof payload.idToken === "string" &&
    payload.idToken.trim().length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);

  if (!isStartGamePayload(payload)) {
    return NextResponse.json(
      { error: "Room ID and ID token are required." },
      { status: 400 },
    );
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(payload.idToken);
    const database = getFirebaseAdminDatabase();
    const roomSnapshot = await database
      .ref(`rooms/${payload.roomId}`)
      .once("value");
    const playersSnapshot = await database
      .ref(`roomPlayers/${payload.roomId}`)
      .once("value");
    const roomValue: unknown = roomSnapshot.val();
    const playersValue: unknown = playersSnapshot.val();

    if (!isRecord(roomValue)) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const settings = isRecord(roomValue.settings) ? roomValue.settings : null;

    if (roomValue.hostUid !== decodedToken.uid) {
      return NextResponse.json(
        { error: "Only the room host can start the game." },
        { status: 403 },
      );
    }

    if (settings?.roomMode !== "dealer") {
      return NextResponse.json(
        { error: "This room is not using Web Dealer mode." },
        { status: 409 },
      );
    }

    const bigBlind = settings.bigBlind;
    if (typeof bigBlind !== "number" || !isRecord(playersValue)) {
      return NextResponse.json(
        { error: "Room state is incomplete." },
        { status: 400 },
      );
    }

    const players = Object.values(playersValue).filter(isRecord);
    if (players.length < 2 || players.length > 9) {
      return NextResponse.json(
        { error: "Web Dealer requires 2-9 players." },
        { status: 400 },
      );
    }

    const playerUids = players.map((player) => player.uid);
    const validPlayerUids = playerUids.filter(
      (uid): uid is string => typeof uid === "string" && uid.length > 0,
    );
    if (
      validPlayerUids.length !== playerUids.length ||
      new Set(validPlayerUids).size !== validPlayerUids.length
    ) {
      return NextResponse.json(
        { error: "Room has invalid player data." },
        { status: 400 },
      );
    }

    const hostPosition = validPlayerUids.indexOf(decodedToken.uid);
    const dealerPosition =
      players.length === 2
        ? (hostPosition + 1) % players.length
        : (hostPosition - 2 + players.length) % players.length;
    const deal = dealHoleCards(validPlayerUids);
    const hand = createHoldemGameState({
      players: players.map((player, seatIndex) => ({
        uid: player.uid as string,
        displayName:
          typeof player.displayName === "string"
            ? player.displayName
            : "Unnamed",
        seatIndex,
      })),
      dealerPosition,
      bigBlind,
      gameMode: "dealer",
    });
    const dealerDeckToken = createDealerDeckToken(deal.remainingDeck);
    const updates: Record<string, unknown> = {
      [`rooms/${payload.roomId}/status`]: "playing",
      [`rooms/${payload.roomId}/gameState/currentBigBlindUid`]:
        decodedToken.uid,
      [`rooms/${payload.roomId}/gameState/handNumber`]: 1,
      [`rooms/${payload.roomId}/gameState/hand`]: hand,
      [`rooms/${payload.roomId}/updatedAt`]: Date.now(),
      [`dealerHands/${payload.roomId}/1/deckToken`]: dealerDeckToken,
    };

    for (const uid of validPlayerUids) {
      updates[`dealerHands/${payload.roomId}/1/${uid}/cards`] =
        deal.playerCards[uid];
    }

    await database.ref().update(updates);

    return NextResponse.json({ ok: true, handNumber: 1 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start dealer game.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
