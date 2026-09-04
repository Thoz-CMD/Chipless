import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import { createHoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class StartGameError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "StartGameError";
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

export async function startGame(roomId: string): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new StartGameError("Please sign in before starting the game.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));
    const roomValue: unknown = roomSnapshot.val();
    const players = snapshotToPlayers(playersSnapshot.val());

    if (players.length < 2) {
      throw new StartGameError("At least 2 players are required to start.", {
        code: "not-enough-players",
      });
    }

    const room =
      roomValue && typeof roomValue === "object"
        ? (roomValue as Record<string, unknown>)
        : null;
    const settings =
      room?.settings && typeof room.settings === "object"
        ? (room.settings as Record<string, unknown>)
        : null;
    const bigBlind =
      typeof settings?.bigBlind === "number" ? settings.bigBlind : undefined;

    if (room?.hostUid !== uid || typeof bigBlind !== "number") {
      throw new StartGameError("Room state is incomplete.", {
        code: "room-invalid",
      });
    }

    const bigBlindPosition = players.findIndex((player) => player.uid === uid);
    const dealerPosition =
      players.length === 2
        ? (bigBlindPosition + 1) % players.length
        : (bigBlindPosition - 2 + players.length) % players.length;
    const allInMode = settings?.allInMode === true;
    const maxAllInAmount =
      typeof settings?.maxAllInAmount === "number"
        ? settings.maxAllInAmount
        : undefined;

    const hand = createHoldemGameState({
      players: players.map((player, seatIndex) => ({
        uid: player.uid,
        displayName: player.displayName ?? "Unnamed",
        seatIndex,
      })),
      dealerPosition,
      bigBlind,
      ...(allInMode ? { gameMode: "allin" as const, maxAllInAmount } : {}),
    });

    await update(ref(database), {
      [`rooms/${roomId}/status`]: "playing",
      [`rooms/${roomId}/gameState/currentBigBlindUid`]: uid,
      [`rooms/${roomId}/gameState/handNumber`]: 1,
      [`rooms/${roomId}/gameState/hand`]: hand,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof StartGameError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can start the game."
          : error.message;

      throw new StartGameError(message, { cause: error, code: error.code });
    }

    if (error instanceof Error) {
      throw new StartGameError(error.message, { cause: error });
    }

    throw new StartGameError("Unable to start game. Please try again.", {
      cause: error,
    });
  }
}
