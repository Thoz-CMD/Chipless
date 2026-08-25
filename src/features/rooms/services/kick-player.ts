import { FirebaseError } from "firebase/app";
import { get, ref, remove } from "firebase/database";

import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { repairRoomAfterPlayerLeaves } from "@/features/rooms/services/repair-room-after-player-leaves";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class KickPlayerError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "KickPlayerError";
    this.code = options?.code;
  }
}

type RoomStateSnapshot = {
  hostUid: string;
};

function isRoomStateSnapshot(value: unknown): value is RoomStateSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  return typeof room.hostUid === "string";
}

export async function kickPlayer({
  roomId,
  targetUid,
}: {
  roomId: string;
  targetUid: string;
}): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const currentUid = auth.currentUser?.uid;

    if (!currentUid) {
      throw new KickPlayerError("Please sign in before managing players.", {
        code: "unauthenticated",
      });
    }

    if (currentUid === targetUid) {
      throw new KickPlayerError("You cannot kick yourself from the room.", {
        code: "self-kick",
      });
    }

    const database = getRealtimeDatabase();
    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const roomValue: unknown = roomSnapshot.val();

    if (!isRoomStateSnapshot(roomValue)) {
      throw new KickPlayerError("Room not found or state is invalid.", {
        code: "room-invalid",
      });
    }

    if (roomValue.hostUid !== currentUid) {
      throw new KickPlayerError("Only the host can kick players.", {
        code: "permission-denied",
      });
    }

    const targetSnapshot = await get(
      ref(database, `roomPlayers/${roomId}/${targetUid}`),
    );

    if (!targetSnapshot.exists()) {
      throw new KickPlayerError("Player is no longer in this room.", {
        code: "player-not-found",
      });
    }

    await repairRoomAfterPlayerLeaves({ roomId, leavingUid: targetUid, isKicked: true });
    await remove(ref(database, `roomPlayers/${roomId}/${targetUid}`));
    void cleanupEmptyRoom(roomId);
  } catch (error) {
    if (error instanceof KickPlayerError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can kick players."
          : error.message;

      throw new KickPlayerError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new KickPlayerError(error.message, { cause: error });
    }

    throw new KickPlayerError("Unable to kick player. Please try again.", {
      cause: error,
    });
  }
}
