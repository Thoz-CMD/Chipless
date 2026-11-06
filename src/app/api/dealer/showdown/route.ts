import { NextResponse } from "next/server";

import {
  evaluateBestHand,
  compareHands,
} from "@/features/game/logic/hand-evaluator";
import { isHoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  getFirebaseAdminDatabase,
  verifyFirebaseIdToken,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function splitPot(
  pot: number,
  winnerUids: readonly string[],
): Map<string, number> {
  const share = Math.floor(pot / winnerUids.length);
  let remainder = pot - share * winnerUids.length;
  const result = new Map<string, number>();

  for (const uid of winnerUids) {
    result.set(uid, share + (remainder > 0 ? 1 : 0));
    remainder -= remainder > 0 ? 1 : 0;
  }

  return result;
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
    const uid = (await verifyFirebaseIdToken(payload.idToken)).uid;
    const database = getFirebaseAdminDatabase();
    const roomSnapshot = await database
      .ref(`rooms/${payload.roomId}`)
      .once("value");
    const room = roomSnapshot.val();
    if (!isRecord(room) || room.hostUid !== uid) {
      return NextResponse.json(
        { error: "Only the room host can settle showdown." },
        { status: 403 },
      );
    }

    const settings = isRecord(room.settings) ? room.settings : null;
    const gameState = isRecord(room.gameState) ? room.gameState : null;
    const hand = gameState?.hand;
    const handNumber =
      typeof gameState?.handNumber === "number" ? gameState.handNumber : 1;
    if (settings?.roomMode !== "dealer" || !isHoldemGameState(hand)) {
      return NextResponse.json(
        { error: "Dealer hand is not available." },
        { status: 409 },
      );
    }
    if (
      hand.bettingRound !== "showdown" ||
      (hand.communityCards?.length ?? 0) !== 5
    ) {
      return NextResponse.json(
        { error: "Showdown is not ready." },
        { status: 409 },
      );
    }

    const privateHandsSnapshot = await database
      .ref(`dealerHands/${payload.roomId}/${handNumber}`)
      .once("value");
    const privateHands = privateHandsSnapshot.val();
    const communityCards = hand.communityCards ?? [];
    const revealedPlayerCards: Record<string, readonly string[]> = {};
    const contenders = hand.players.filter((player) => !player.hasFolded);

    if (contenders.length === 0) {
      return NextResponse.json(
        { error: "No active players remain." },
        { status: 409 },
      );
    }

    const evaluated = contenders.map((player) => {
      const privatePlayer =
        isRecord(privateHands) && isRecord(privateHands[player.uid])
          ? (privateHands[player.uid] as Record<string, unknown>)
          : null;
      const privateValue = privatePlayer?.cards;
      if (
        !Array.isArray(privateValue) ||
        !privateValue.every((card) => typeof card === "string")
      ) {
        throw new Error(`Private cards are missing for ${player.uid}.`);
      }
      revealedPlayerCards[player.uid] = privateValue;
      return {
        player,
        hand: evaluateBestHand([...privateValue, ...communityCards]),
      };
    });
    const best = evaluated.reduce((current, candidate) =>
      compareHands(candidate.hand, current.hand) > 0 ? candidate : current,
    );
    const winnerUids = evaluated
      .filter((candidate) => compareHands(candidate.hand, best.hand) === 0)
      .map((candidate) => candidate.player.uid);
    const shares = splitPot(hand.pot, winnerUids);
    const playerResults = Object.fromEntries(
      hand.players.map((player) => [
        player.uid,
        {
          uid: player.uid,
          displayName: player.displayName,
          contribution: player.totalContribution,
          net: (shares.get(player.uid) ?? 0) - player.totalContribution,
          hasFolded: player.hasFolded,
        },
      ]),
    );
    const winnerNames = winnerUids.map(
      (winnerUid) =>
        hand.players.find((player) => player.uid === winnerUid)?.displayName ??
        winnerUid,
    );
    const settlement = {
      handNumber,
      winnerUid: winnerUids[0],
      winnerUids,
      winnerName: winnerNames.join(", "),
      pot: hand.pot,
      playerResults,
      createdAt: Date.now(),
    };
    for (const player of hand.players) {
      if (revealedPlayerCards[player.uid]) continue;
      const privatePlayer =
        isRecord(privateHands) && isRecord(privateHands[player.uid])
          ? (privateHands[player.uid] as Record<string, unknown>)
          : null;
      const privateValue = privatePlayer?.cards;
      if (
        Array.isArray(privateValue) &&
        privateValue.every((card) => typeof card === "string")
      ) {
        revealedPlayerCards[player.uid] = privateValue;
      }
    }

    const nextHand = {
      ...hand,
      bettingRound: "summary" as const,
      currentTurn: -1,
      playerCards: revealedPlayerCards,
    };

    await database.ref().update({
      [`rooms/${payload.roomId}/gameState/hand`]: nextHand,
      [`rooms/${payload.roomId}/gameState/settlements/${handNumber}`]:
        settlement,
      [`rooms/${payload.roomId}/updatedAt`]: Date.now(),
    });

    return NextResponse.json({ ok: true, settlement });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to settle showdown.",
      },
      { status: 500 },
    );
  }
}
