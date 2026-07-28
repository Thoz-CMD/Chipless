import { FirebaseError } from "firebase/app";
import { update, ref, serverTimestamp } from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";
import { sha256Hex } from "@/lib/crypto/sha256";
import type { CreateRoomFormValues } from "@/lib/validations/create-room";

type CreateRoomInput = CreateRoomFormValues & {
  hostDisplayName: string;
};

const roomIdAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomIdLength = 8;

export class CreateRoomError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "CreateRoomError";
    this.code = options?.code;
  }
}

export type CreatedRoom = {
  roomId: string;
};

function getErrorCode(error: Error): string | undefined {
  return "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

function createRoomId(): string {
  const randomValues = new Uint32Array(roomIdLength);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => roomIdAlphabet[value % roomIdAlphabet.length])
    .join("");
}

async function getSignedInUid(): Promise<string> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const credential = await signInWithAnonymousAccount();
  return credential.user.uid;
}

export async function createRoom(
  values: CreateRoomInput,
): Promise<CreatedRoom> {
  try {
    const uid = await getSignedInUid();

    const passcodeHash = await sha256Hex(values.roomPasscode);
    const database = getRealtimeDatabase();
    const timestamp = serverTimestamp();
    const roomId = createRoomId();

    const updates = {
      [`rooms/${roomId}`]: {
        id: roomId,
        name: values.roomName,
        hostUid: uid,
        status: "waiting",
        settings: {
          bigBlind: values.bigBlind,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      [`roomPlayers/${roomId}/${uid}`]: {
        uid,
        displayName: values.hostDisplayName,
        role: "host",
        joinedAt: timestamp,
        online: true,
      },
      [`roomSecrets/${roomId}`]: {
        hostUid: uid,
        passcodeHash,
      },
    };

    await update(ref(database), updates);

    return { roomId };
  } catch (error) {
    if (error instanceof CreateRoomError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const permissionHelp =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? " Realtime Database Rules rejected the write. Deploy database.rules.json with `firebase deploy --only database`, then try again."
          : "";

      throw new CreateRoomError(
        `Unable to create room (${error.code}): ${error.message}.${permissionHelp}`,
        {
          cause: error,
          code: error.code,
        },
      );
    }

    if (error instanceof Error) {
      const code = getErrorCode(error);

      throw new CreateRoomError(error.message, { cause: error, code });
    }

    throw new CreateRoomError("Unable to create room. Please try again.", {
      cause: error,
    });
  }
}
