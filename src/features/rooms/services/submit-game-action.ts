import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import {
  applyHoldemAction,
  isHoldemGameState,
  type HoldemAction,
} from "@/features/game/logic/texas-holdem";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class SubmitGameActionError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "SubmitGameActionError";
    this.code = options?.code;
  }
}

export async function submitGameAction(
  roomId: string,
  action: HoldemAction,
): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new SubmitGameActionError("Please sign in before acting.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const handSnapshot = await get(
      ref(database, `rooms/${roomId}/gameState/hand`),
    );
    const handValue: unknown = handSnapshot.val();

    if (!isHoldemGameState(handValue)) {
      throw new SubmitGameActionError("Game hand state is not available.", {
        code: "hand-not-found",
      });
    }

    const currentPlayer = handValue.players[handValue.currentTurn];

    if (currentPlayer?.uid !== uid) {
      throw new SubmitGameActionError("It is not your turn.", {
        code: "not-current-turn",
      });
    }

    const nextHandState = applyHoldemAction(handValue, action);

    await update(ref(database), {
      [`rooms/${roomId}/gameState/hand`]: nextHandState,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SubmitGameActionError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      throw new SubmitGameActionError(error.message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new SubmitGameActionError(error.message, { cause: error });
    }

    throw new SubmitGameActionError("Unable to submit action.", {
      cause: error,
    });
  }
}
