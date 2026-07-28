import { FirebaseError } from "firebase/app";
import { ref, update } from "firebase/database";

import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class UpdatePlayerSeatsError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "UpdatePlayerSeatsError";
    this.code = options?.code;
  }
}

export async function updatePlayerSeatOrder(
  roomId: string,
  orderedPlayerUids: string[],
): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new UpdatePlayerSeatsError(
        "Please sign in before changing seats.",
        {
          code: "unauthenticated",
        },
      );
    }

    const updates = orderedPlayerUids.reduce<Record<string, number>>(
      (paths, playerUid, seatIndex) => {
        paths[`roomPlayers/${roomId}/${playerUid}/seatIndex`] = seatIndex;
        return paths;
      },
      {},
    );

    await update(ref(getRealtimeDatabase()), updates);
  } catch (error) {
    if (error instanceof UpdatePlayerSeatsError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can change seats."
          : error.message;

      throw new UpdatePlayerSeatsError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new UpdatePlayerSeatsError(error.message, { cause: error });
    }

    throw new UpdatePlayerSeatsError(
      "Unable to change seats. Please try again.",
      {
        cause: error,
      },
    );
  }
}
