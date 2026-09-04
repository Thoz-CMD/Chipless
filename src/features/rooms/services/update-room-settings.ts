import { FirebaseError } from "firebase/app";
import { ref, update } from "firebase/database";

import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class UpdateRoomSettingsError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "UpdateRoomSettingsError";
    this.code = options?.code;
  }
}

export type UpdateRoomSettingsInput = {
  allInMode?: boolean;
  maxAllInAmount?: number | null;
};

export async function updateRoomSettings(
  roomId: string,
  settings: UpdateRoomSettingsInput,
): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new UpdateRoomSettingsError("Please sign in before updating settings.", {
        code: "unauthenticated",
      });
    }

    const db = getRealtimeDatabase();
    const now = Date.now();

    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/settings/allInMode`]: settings.allInMode ?? false,
      [`rooms/${roomId}/settings/maxAllInAmount`]:
        settings.allInMode && typeof settings.maxAllInAmount === "number" && settings.maxAllInAmount > 0
          ? settings.maxAllInAmount
          : null,
      [`rooms/${roomId}/updatedAt`]: now,
    };

    await update(ref(db), updates);
  } catch (error) {
    if (error instanceof UpdateRoomSettingsError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can update room settings."
          : error.message;

      throw new UpdateRoomSettingsError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new UpdateRoomSettingsError(error.message, { cause: error });
    }

    throw new UpdateRoomSettingsError("Unable to update room settings.", {
      cause: error,
    });
  }
}
