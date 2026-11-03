import { NextResponse } from "next/server";

import { createHoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  createDealerDeckToken,
  dealHoleCards,
} from "@/features/game/services/dealer-deck";
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDatabase,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  if (
    !isRecord(payload) ||
    typeof payload.roomId !== "string" ||
    typeof payload.idToken !== "string"
  ) {
    return NextResponse.json(
      { error: "Room ID and ID token are required." },
      { status: 400 },
    );
  }

  try {
    const uid = (await getFirebaseAdminAuth().verifyIdToken(payload.idToken))
      .uid;
    const database = getFirebaseAdminDatabase();
    const roomRef = database.ref(`rooms/${payload.roomId}`);
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      roomRef.once("value"),
      database.ref(`roomPlayers/${payload.roomId}`).once("value"),
    ]);
    const room = roomSnapshot.val();
    const playersValue = playersSnapshot.val();

    if (!isRecord(room) || !isRecord(playersValue)) {
      return NextResponse.json(
        { error: "Room state is incomplete." },
        { status: 400 },
      );
    }
    if (room.hostUid !== uid) {
      return NextResponse.json(
        { error: "Only the room host can start the next hand." },
        { status: 403 },
      );
    }
    const settings = isRecord(room.settings) ? room.settings : null;
    const currentGameState = isRecord(room.gameState) ? room.gameState : null;
    const currentHand = currentGameState?.hand;
    if (settings?.roomMode !== "dealer" || !isRecord(currentHand)) {
      return NextResponse.json(
        { error: "Dealer hand is not available." },
        { status: 409 },
      );
    }

    const players = Object.values(playersValue).filter(
      (player): player is Record<string, unknown> =>
        isRecord(player) && player.pendingLeave !== true,
    );
    const playerUids = players
      .map((player) => player.uid)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    if (
      playerUids.length < 2 ||
      playerUids.length > 9 ||
      new Set(playerUids).size !== playerUids.length
    ) {
      return NextResponse.json(
        { error: "Web Dealer requires 2-9 valid players." },
        { status: 400 },
      );
    }

    const bigBlind = settings.bigBlind;
    const currentBigBlindUid =
      typeof currentGameState?.currentBigBlindUid === "string"
        ? currentGameState.currentBigBlindUid
        : uid;
    const currentBigBlindIndex = playerUids.indexOf(currentBigBlindUid);
    const nextBigBlindIndex =
      currentBigBlindIndex < 0
        ? 0
        : (currentBigBlindIndex + 1) % playerUids.length;
    const nextBigBlindUid = playerUids[nextBigBlindIndex];
    const dealerPosition =
      playerUids.length === 2
        ? (nextBigBlindIndex + 1) % playerUids.length
        : (nextBigBlindIndex - 2 + playerUids.length) % playerUids.length;
    const handNumber =
      typeof currentGameState?.handNumber === "number"
        ? currentGameState.handNumber + 1
        : 2;
    if (typeof bigBlind !== "number" || !nextBigBlindUid) {
      return NextResponse.json(
        { error: "Room settings are incomplete." },
        { status: 400 },
      );
    }

    const deal = dealHoleCards(playerUids);
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
    const updates: Record<string, unknown> = {
      [`rooms/${payload.roomId}/status`]: "playing",
      [`rooms/${payload.roomId}/gameState/currentBigBlindUid`]: nextBigBlindUid,
      [`rooms/${payload.roomId}/gameState/handNumber`]: handNumber,
      [`rooms/${payload.roomId}/gameState/hand`]: hand,
      [`rooms/${payload.roomId}/updatedAt`]: Date.now(),
      [`dealerHands/${payload.roomId}/${handNumber}/deckToken`]:
        createDealerDeckToken(deal.remainingDeck),
    };
    for (const playerUid of playerUids) {
      updates[
        `dealerHands/${payload.roomId}/${handNumber}/${playerUid}/cards`
      ] = deal.playerCards[playerUid];
    }
    for (const [playerUid, player] of Object.entries(playersValue)) {
      if (isRecord(player) && player.pendingLeave === true) {
        updates[`roomPlayers/${payload.roomId}/${playerUid}`] = null;
      }
    }

    await database.ref().update(updates);
    return NextResponse.json({ ok: true, handNumber });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start next dealer hand.",
      },
      { status: 500 },
    );
  }
}
