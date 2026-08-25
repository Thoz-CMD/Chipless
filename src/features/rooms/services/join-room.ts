import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";
import { sha256Hex } from "@/lib/crypto/sha256";

type RoomRecord = {
  id: string;
  name: string;
  hostUid: string;
  status: "waiting" | "playing";
  settings: {
    bigBlind: number;
  };
};

function buildExistingPlayerUpdate(
  uid: string,
  value: unknown,
): RoomPlayerRecord | null {
  if (!isRoomPlayerRecord(value) || value.uid !== uid) {
    return null;
  }

  return {
    ...value,
    online: true,
  };
}

export class JoinRoomError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "JoinRoomError";
    this.code = options?.code;
  }
}

export type JoinedRoom = {
  roomId: string;
};

export type JoinRoomInput = {
  roomId: string;
  roomPasscode: string;
};

function isRoomRecord(value: unknown): value is RoomRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  const settings = room.settings as Record<string, unknown> | undefined;

  return (
    typeof room.id === "string" &&
    typeof room.name === "string" &&
    typeof room.hostUid === "string" &&
    (room.status === "waiting" || room.status === "playing") &&
    Boolean(settings) &&
    typeof settings?.bigBlind === "number"
  );
}

function getErrorCode(error: Error): string | undefined {
  return "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

async function getSignedInUid(): Promise<string> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const credential = await signInWithAnonymousAccount();
  return credential.user.uid;
}

export async function joinRoom(values: JoinRoomInput): Promise<JoinedRoom> {
  try {
    const uid = await getSignedInUid();
    const database = getRealtimeDatabase();

    const roomSnapshot = await get(ref(database, `rooms/${values.roomId}`));
    const roomValue: unknown = roomSnapshot.val();

    if (!roomSnapshot.exists()) {
      throw new JoinRoomError("Room no longer exists", {
        code: "room-no-longer-exists",
      });
    }

    if (!isRoomRecord(roomValue)) {
      const status =
        roomValue && typeof roomValue === "object" && "status" in roomValue
          ? roomValue.status
          : undefined;

      if (status !== "waiting" && status !== "playing") {
        throw new JoinRoomError("This room is no longer available", {
          code: "room-not-available",
        });
      }

      throw new JoinRoomError("Room no longer exists", {
        code: "room-invalid",
      });
    }

    const passcodeHashSnapshot = await get(
      ref(database, `roomSecrets/${values.roomId}/passcodeHash`),
    );
    const storedPasscodeHash: unknown = passcodeHashSnapshot.val();

    if (typeof storedPasscodeHash !== "string") {
      throw new JoinRoomError("Room PIN is not available", {
        code: "passcode-unavailable",
      });
    }

    const enteredPasscodeHash = await sha256Hex(values.roomPasscode);

    if (enteredPasscodeHash !== storedPasscodeHash) {
      throw new JoinRoomError("Incorrect room PIN", {
        code: "incorrect-passcode",
      });
    }

    const playerPath = `roomPlayers/${values.roomId}/${uid}`;
    const playerSnapshot = await get(ref(database, playerPath));
    const existingPlayer = playerSnapshot.exists()
      ? buildExistingPlayerUpdate(uid, playerSnapshot.val())
      : null;
    
    // Check if player has previous seat information
    const historySnapshot = await get(ref(database, `roomPlayerHistory/${values.roomId}/${uid}`));
    const playerHistory = historySnapshot.exists() ? historySnapshot.val() : null;
    
    // Get current players to check if seat is available
    const allPlayersSnapshot = await get(ref(database, `roomPlayers/${values.roomId}`));
    const allPlayers = allPlayersSnapshot.exists() ? allPlayersSnapshot.val() : {};
    const currentSeatIndices = Object.values(allPlayers)
      .filter((p: any) => p && typeof p === 'object' && typeof p.seatIndex === 'number')
      .map((p: any) => p.seatIndex);
    
    const updates =
      existingPlayer !== null
        ? {
            [playerPath]: existingPlayer,
          }
        : (() => {
            const newPlayerData: Record<string, unknown> = {
              uid,
              role: "player",
              joinedAt: playerHistory?.joinedAt || serverTimestamp(),
              online: true,
            };
            
            // Only restore seat if it's not taken by someone else
            if (playerHistory?.seatIndex !== undefined && 
                typeof playerHistory.seatIndex === 'number' && 
                !currentSeatIndices.includes(playerHistory.seatIndex)) {
              newPlayerData.seatIndex = playerHistory.seatIndex;
            }
            
            // Only restore displayName if it exists and is valid
            if (playerHistory?.displayName !== undefined && 
                typeof playerHistory.displayName === 'string' && 
                playerHistory.displayName.length >= 2) {
              newPlayerData.displayName = playerHistory.displayName;
            }
            
            // Only restore photoUrl if it exists and is valid
            if (playerHistory?.photoUrl !== undefined && 
                typeof playerHistory.photoUrl === 'string') {
              newPlayerData.photoUrl = playerHistory.photoUrl;
            }
            
            return { [playerPath]: newPlayerData };
          })();

    await update(ref(database), updates);

    return { roomId: values.roomId };
  } catch (error) {
    if (error instanceof JoinRoomError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Firebase permission denied"
          : error.code === "auth/network-request-failed" ||
              error.code === "network-request-failed"
            ? "Network error"
            : error.message;

      throw new JoinRoomError(message, { cause: error, code: error.code });
    }

    if (error instanceof Error) {
      const code = getErrorCode(error);

      throw new JoinRoomError(error.message, { cause: error, code });
    }

    throw new JoinRoomError("Unable to join room. Please try again.", {
      cause: error,
    });
  }
}
