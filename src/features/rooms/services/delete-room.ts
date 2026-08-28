import { FirebaseError } from "firebase/app";
import { get, ref, remove } from "firebase/database";

import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class DeleteRoomError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "DeleteRoomError";
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

export async function deleteRoom(roomId: string): Promise<void> {
  try {
    const currentUid = getFirebaseAuth().currentUser?.uid;

    if (!currentUid) {
      throw new DeleteRoomError("Please sign in before deleting the room.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const roomValue: unknown = roomSnapshot.val();

    if (!isRoomStateSnapshot(roomValue)) {
      throw new DeleteRoomError("Room not found or state is invalid.", {
        code: "room-invalid",
      });
    }

    if (roomValue.hostUid !== currentUid) {
      throw new DeleteRoomError("Only the host can delete the room.", {
        code: "permission-denied",
      });
    }

    // Remove player entries first so rules that depend on the room still existing pass.
    // This may need retries when connected clients briefly rewrite presence.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));
      const playerEntries = playersSnapshot.val() as
        | Record<string, unknown>
        | null;

      if (!playerEntries || Object.keys(playerEntries).length === 0) {
        break;
      }

      await Promise.all(
        Object.keys(playerEntries).map((uid) =>
          remove(ref(database, `roomPlayers/${roomId}/${uid}`)),
        ),
      );
    }

    const remainingPlayersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));
    const remainingPlayers = remainingPlayersSnapshot.val() as
      | Record<string, unknown>
      | null;

    if (remainingPlayers && Object.keys(remainingPlayers).length > 0) {
      throw new DeleteRoomError(
        "Unable to delete room while players are still connected. Please try again.",
        {
          code: "players-still-connected",
        },
      );
    }

    // Delete room secrets (rules allow this only when no players remain).
    await remove(ref(database, `roomSecrets/${roomId}`));

    // Delete room player history
    await remove(ref(database, `roomPlayerHistory/${roomId}`));

    // Finally delete the room itself.
    await remove(ref(database, `rooms/${roomId}`));
  } catch (error) {
    if (error instanceof DeleteRoomError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can delete the room."
          : error.message;

      throw new DeleteRoomError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new DeleteRoomError(error.message, { cause: error });
    }

    throw new DeleteRoomError("Unable to delete room. Please try again.", {
      cause: error,
    });
  }
}
