import { FirebaseError } from "firebase/app";
import { onDisconnect, ref, remove, set } from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { repairRoomAfterPlayerLeaves } from "@/features/rooms/services/repair-room-after-player-leaves";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export class PlayerPresenceError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "PlayerPresenceError";
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

async function removePlayerAndDeleteEmptyRoom(
  roomId: string,
  uid: string,
): Promise<void> {
  const database = getRealtimeDatabase();

  await repairRoomAfterPlayerLeaves({ roomId, leavingUid: uid });
  await remove(ref(database, `roomPlayers/${roomId}/${uid}`));
  await cleanupEmptyRoom(roomId);
}

export async function setupPlayerPresence(roomId: string): Promise<() => void> {
  try {
    const uid = await getSignedInUid();
    const database = getRealtimeDatabase();
    const onlineRef = ref(database, `roomPlayers/${roomId}/${uid}/online`);
    const disconnectOperation = onDisconnect(onlineRef);
    const markOnline = () => {
      void set(onlineRef, true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
      }
    };

    await set(onlineRef, true);
    await disconnectOperation.set(false);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", markOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", markOnline);
      void disconnectOperation.cancel();
      void removePlayerAndDeleteEmptyRoom(roomId, uid);
    };
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new PlayerPresenceError(error.message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new PlayerPresenceError(error.message, { cause: error });
    }

    throw new PlayerPresenceError("Unable to update player presence.", {
      cause: error,
    });
  }
}
