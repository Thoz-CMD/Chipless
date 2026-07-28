import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";
import type { PlayerNameFormValues } from "@/lib/validations/player-name";

export class UpdatePlayerNameError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "UpdatePlayerNameError";
    this.code = options?.code;
  }
}

async function getSignedInUid(): Promise<string> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const credential = await signInWithAnonymousAccount();
  return credential.user.uid;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function getDuplicateNameError(
  players: Record<string, RoomPlayerRecord>,
  uid: string,
  displayName: string,
): UpdatePlayerNameError | null {
  const nextName = normalizeName(displayName);
  const duplicatePlayer = Object.values(players).find(
    (player) =>
      player.uid !== uid &&
      player.displayName !== undefined &&
      normalizeName(player.displayName) === nextName,
  );

  return duplicatePlayer
    ? new UpdatePlayerNameError("This name is already taken", {
        code: "duplicate-player-name",
      })
    : null;
}

function snapshotToPlayers(value: unknown): Record<string, RoomPlayerRecord> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, RoomPlayerRecord>
  >((players, [uid, player]) => {
    if (isRoomPlayerRecord(player)) {
      players[uid] = player;
    }

    return players;
  }, {});
}

export async function updatePlayerName(
  roomId: string,
  values: PlayerNameFormValues,
): Promise<void> {
  try {
    const uid = await getSignedInUid();
    const database = getRealtimeDatabase();
    const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));
    const players = snapshotToPlayers(playersSnapshot.val());
    const currentPlayer = players[uid];

    if (!currentPlayer) {
      throw new UpdatePlayerNameError("Player record not found.", {
        code: "player-not-found",
      });
    }

    const duplicateError = getDuplicateNameError(
      players,
      uid,
      values.displayName,
    );

    if (duplicateError) {
      throw duplicateError;
    }

    const playerPath = `roomPlayers/${roomId}/${uid}`;
    const updates =
      currentPlayer.joinedAt === undefined
        ? {
            [playerPath]: {
              uid,
              displayName: values.displayName,
              role: currentPlayer.role,
              joinedAt: serverTimestamp(),
              online: true,
            },
          }
        : {
            [`${playerPath}/displayName`]: values.displayName,
            [`${playerPath}/online`]: true,
          };

    await update(ref(database), updates);
  } catch (error) {
    if (error instanceof UpdatePlayerNameError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      throw new UpdatePlayerNameError(error.message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new UpdatePlayerNameError(error.message, { cause: error });
    }

    throw new UpdatePlayerNameError("Unable to save player name.", {
      cause: error,
    });
  }
}
