import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import {
  createHoldemGameState,
  isHoldemGameState,
  type HoldemGameState,
} from "@/features/game/logic/texas-holdem";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export type HandSettlementPlayerResult = {
  uid: string;
  displayName: string;
  contribution: number;
  net: number;
};

export type HandSettlement = {
  handNumber: number;
  winnerUid: string;
  winnerName: string;
  pot: number;
  playerResults: Record<string, HandSettlementPlayerResult>;
  createdAt?: number;
};

type RoomGameState = {
  currentBigBlindUid?: string;
  handNumber?: number;
  hand?: unknown;
};

type RoomStateRecord = {
  hostUid: string;
  settings: {
    bigBlind: number;
  };
  gameState?: RoomGameState;
};

export class SettleHandError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "SettleHandError";
    this.code = options?.code;
  }
}

function joinedAtValue(player: RoomPlayerRecord): number {
  return player.joinedAt ?? 0;
}

function snapshotToPlayers(value: unknown): RoomPlayerRecord[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter(isRoomPlayerRecord)
    .sort((first, second) => {
      if (
        typeof first.seatIndex === "number" &&
        typeof second.seatIndex === "number"
      ) {
        return first.seatIndex - second.seatIndex;
      }

      if (typeof first.seatIndex === "number") {
        return -1;
      }

      if (typeof second.seatIndex === "number") {
        return 1;
      }

      return joinedAtValue(first) - joinedAtValue(second);
    });
}

function isRoomStateRecord(value: unknown): value is RoomStateRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  const settings = room.settings as Record<string, unknown> | undefined;
  const gameState = room.gameState as Record<string, unknown> | undefined;

  return (
    typeof room.hostUid === "string" &&
    Boolean(settings) &&
    typeof settings?.bigBlind === "number" &&
    (gameState === undefined ||
      ((gameState.currentBigBlindUid === undefined ||
        typeof gameState.currentBigBlindUid === "string") &&
        (gameState.handNumber === undefined ||
          typeof gameState.handNumber === "number") &&
        (gameState.hand === undefined || isHoldemGameState(gameState.hand))))
  );
}

function createSettlement(
  hand: HoldemGameState,
  handNumber: number,
  winnerUid: string,
): HandSettlement {
  const winner = hand.players.find((player) => player.uid === winnerUid);

  if (!winner) {
    throw new SettleHandError("Selected winner is not in this hand.", {
      code: "winner-not-found",
    });
  }

  const playerResults = hand.players.reduce<
    Record<string, HandSettlementPlayerResult>
  >((results, player) => {
    const contribution = player.totalContribution;

    results[player.uid] = {
      uid: player.uid,
      displayName: player.displayName,
      contribution,
      net: player.uid === winnerUid ? hand.pot - contribution : -contribution,
    };

    return results;
  }, {});

  return {
    handNumber,
    winnerUid,
    winnerName: winner.displayName,
    pot: hand.pot,
    playerResults,
  };
}

export async function settleHand({
  roomId,
  winnerUid,
}: {
  roomId: string;
  winnerUid: string;
}): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new SettleHandError("Please sign in before settling the hand.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${roomId}`)),
      get(ref(database, `roomPlayers/${roomId}`)),
    ]);
    const roomValue: unknown = roomSnapshot.val();

    if (!isRoomStateRecord(roomValue)) {
      throw new SettleHandError("Room state is incomplete.", {
        code: "room-invalid",
      });
    }

    if (roomValue.hostUid !== uid) {
      throw new SettleHandError("Only the host can settle the hand.", {
        code: "permission-denied",
      });
    }

    const hand = roomValue.gameState?.hand;

    if (!isHoldemGameState(hand)) {
      throw new SettleHandError("No active hand to settle.", {
        code: "hand-not-found",
      });
    }

    if (hand.bettingRound !== "showdown") {
      throw new SettleHandError("The hand is not ready for showdown.", {
        code: "hand-not-showdown",
      });
    }

    const players = snapshotToPlayers(playersSnapshot.val());

    if (players.length < 2) {
      throw new SettleHandError(
        "At least 2 players are required for next hand.",
        {
          code: "not-enough-players",
        },
      );
    }

    const handNumber = roomValue.gameState?.handNumber ?? 1;
    const settlement = createSettlement(hand, handNumber, winnerUid);
    const currentBigBlindUid =
      roomValue.gameState?.currentBigBlindUid ?? roomValue.hostUid;
    const currentIndex = players.findIndex(
      (player) => player.uid === currentBigBlindUid,
    );
    const nextIndex =
      currentIndex < 0 ? 0 : (currentIndex + 1) % players.length;
    const nextBigBlindUid = players[nextIndex]?.uid;

    if (!nextBigBlindUid) {
      throw new SettleHandError("Unable to find the next big blind.", {
        code: "next-big-blind-not-found",
      });
    }

    const dealerPosition =
      players.length === 2
        ? (nextIndex + 1) % players.length
        : (nextIndex - 2 + players.length) % players.length;
    const nextHand = createHoldemGameState({
      players: players.map((player, seatIndex) => ({
        uid: player.uid,
        displayName: player.displayName ?? "Unnamed",
        seatIndex,
      })),
      dealerPosition,
      bigBlind: roomValue.settings.bigBlind,
    });

    await update(ref(database), {
      [`rooms/${roomId}/gameState/settlements/${handNumber}`]: {
        ...settlement,
        createdAt: serverTimestamp(),
      },
      [`rooms/${roomId}/gameState/currentBigBlindUid`]: nextBigBlindUid,
      [`rooms/${roomId}/gameState/handNumber`]: handNumber + 1,
      [`rooms/${roomId}/gameState/hand`]: nextHand,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SettleHandError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can settle the hand."
          : error.message;

      throw new SettleHandError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new SettleHandError(error.message, { cause: error });
    }

    throw new SettleHandError("Unable to settle hand. Please try again.", {
      cause: error,
    });
  }
}
