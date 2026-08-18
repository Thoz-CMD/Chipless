import { FirebaseError } from "firebase/app";
import { get, ref, update } from "firebase/database";

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
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${roomId}`)),
      get(ref(database, `roomPlayers/${roomId}`)),
    ]);
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

    const playerEntries = playersSnapshot.val() as Record<string, unknown> | null;
    const updates: Record<string, null> = {
      [`rooms/${roomId}`]: null,
      [`roomSecrets/${roomId}`]: null,
    };

    if (playerEntries) {
      Object.keys(playerEntries).forEach((uid) => {
        updates[`roomPlayers/${roomId}/${uid}`] = null;
      });
    }

    await update(ref(database), updates);
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
