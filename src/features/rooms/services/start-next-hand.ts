import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import { createHoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class StartNextHandError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "StartNextHandError";
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

export async function startNextHand(roomId: string): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new StartNextHandError("Please sign in before starting the next hand.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${roomId}`)),
      get(ref(database, `roomPlayers/${roomId}`)),
    ]);

    const roomValue: unknown = roomSnapshot.val();

    if (!roomSnapshot.exists() || !roomValue || typeof roomValue !== "object") {
      throw new StartNextHandError("Room no longer exists.", {
        code: "room-not-found",
      });
    }

    const room = roomValue as Record<string, unknown>;
    const settings = room.settings as Record<string, unknown> | undefined;
    const gameState = room.gameState as Record<string, unknown> | undefined;
    const bigBlind = typeof settings?.bigBlind === "number" ? settings.bigBlind : undefined;

    if (room.hostUid !== uid || typeof bigBlind !== "number") {
      throw new StartNextHandError("Only the host can start the next hand.", {
        code: "unauthorized",
      });
    }

    const allPlayers = snapshotToPlayers(playersSnapshot.val());
    const leavingPlayers = allPlayers.filter((player) => player.pendingLeave);
    const players = allPlayers.filter((player) => !player.pendingLeave);

    if (players.length < 2) {
      throw new StartNextHandError("At least 2 players are required to play.", {
        code: "not-enough-players",
      });
    }

    const currentBigBlindUid =
      (typeof gameState?.currentBigBlindUid === "string"
        ? gameState.currentBigBlindUid
        : null) ?? (room.hostUid as string);

    const currentIndex = players.findIndex((player) => player.uid === currentBigBlindUid);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % players.length;
    const nextBigBlindUid = players[nextIndex]?.uid ?? players[0]?.uid;

    if (!nextBigBlindUid) {
      throw new StartNextHandError("Unable to determine the next big blind.", {
        code: "next-big-blind-not-found",
      });
    }

    const currentHandNumber =
      typeof gameState?.handNumber === "number" ? gameState.handNumber : 1;
    const nextHandNumber = currentHandNumber + 1;

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
      bigBlind,
    });

    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/status`]: "playing",
      [`rooms/${roomId}/gameState/currentBigBlindUid`]: nextBigBlindUid,
      [`rooms/${roomId}/gameState/handNumber`]: nextHandNumber,
      [`rooms/${roomId}/gameState/hand`]: nextHand,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    };

    for (const leavingPlayer of leavingPlayers) {
      updates[`roomPlayers/${roomId}/${leavingPlayer.uid}`] = null;
    }

    await update(ref(database), updates);
  } catch (error) {
    if (error instanceof StartNextHandError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can start the next hand."
          : error.message;

      throw new StartNextHandError(message, { cause: error, code: error.code });
    }

    if (error instanceof Error) {
      throw new StartNextHandError(error.message, { cause: error });
    }

    throw new StartNextHandError("Unable to start next hand. Please try again.", {
      cause: error,
    });
  }
}
