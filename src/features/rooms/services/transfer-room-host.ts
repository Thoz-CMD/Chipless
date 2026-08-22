import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import { isRoomPlayerRecord } from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class TransferRoomHostError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "TransferRoomHostError";
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

export async function transferRoomHost({
  roomId,
  targetUid,
}: {
  roomId: string;
  targetUid: string;
}): Promise<void> {
  try {
    const currentUid = getFirebaseAuth().currentUser?.uid;

    if (!currentUid) {
      throw new TransferRoomHostError(
        "Please sign in before changing the host.",
        {
          code: "unauthenticated",
        },
      );
    }

    if (currentUid === targetUid) {
      throw new TransferRoomHostError("You are already the host.", {
        code: "self-transfer",
      });
    }

    const database = getRealtimeDatabase();
    const [roomSnapshot, targetSnapshot, roomSecretsSnapshot] = await Promise.all([
      get(ref(database, `rooms/${roomId}`)),
      get(ref(database, `roomPlayers/${roomId}/${targetUid}`)),
      get(ref(database, `roomSecrets/${roomId}`)),
    ]);
    const roomValue: unknown = roomSnapshot.val();
    const targetValue: unknown = targetSnapshot.val();

    if (!isRoomStateSnapshot(roomValue)) {
      throw new TransferRoomHostError("Room not found or state is invalid.", {
        code: "room-invalid",
      });
    }

    if (roomValue.hostUid !== currentUid) {
      throw new TransferRoomHostError("Only the host can change the host.", {
        code: "permission-denied",
      });
    }

    if (!isRoomPlayerRecord(targetValue)) {
      throw new TransferRoomHostError("Player is no longer in this room.", {
        code: "player-not-found",
      });
    }

    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/hostUid`]: targetUid,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
      [`roomPlayers/${roomId}/${currentUid}/role`]: "player",
      [`roomPlayers/${roomId}/${targetUid}/role`]: "host",
    };

    if (roomSecretsSnapshot.exists()) {
      updates[`roomSecrets/${roomId}/hostUid`] = targetUid;
    }

    await update(ref(database), updates);
  } catch (error) {
    if (error instanceof TransferRoomHostError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can change the host."
          : error.message;

      throw new TransferRoomHostError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new TransferRoomHostError(error.message, { cause: error });
    }

    throw new TransferRoomHostError("Unable to change host. Please try again.", {
      cause: error,
    });
  }
}
