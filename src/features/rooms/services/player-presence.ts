import { FirebaseError } from "firebase/app";
import {
  onDisconnect,
  ref,
  remove,
  serverTimestamp,
  update,
} from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { repairRoomAfterPlayerLeaves } from "@/features/rooms/services/repair-room-after-player-leaves";
import {
  getFirebaseAuth,
  getRealtimeDatabase,
} from "@/lib/firebase/client";

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

function removePlayerWithKeepalive({
  roomId,
  uid,
  idToken,
}: {
  roomId: string;
  uid: string;
  idToken: string | null;
}): void {
  if (!idToken) {
    return;
  }

  const body = JSON.stringify({ idToken, roomId, uid });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/leave-room",
      new Blob([body], { type: "application/json" }),
    );

    if (sent) {
      return;
    }
  }

  void fetch("/api/leave-room", {
    body,
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    keepalive: true,
  }).catch(() => {
    // The regular Firebase cleanup path remains as a fallback.
  });
}

export async function setupPlayerPresence(roomId: string): Promise<() => void> {
  try {
    const uid = await getSignedInUid();
    let cachedIdToken =
      (await getFirebaseAuth().currentUser?.getIdToken().catch(() => null)) ??
      null;
    const database = getRealtimeDatabase();
    const playerRef = ref(database, `roomPlayers/${roomId}/${uid}`);
    const disconnectOperation = onDisconnect(playerRef);
    const markOnline = () => {
      void update(playerRef, {
        lastSeen: serverTimestamp(),
        online: true,
      });
    };
    const markOffline = () => {
      void update(playerRef, {
        lastSeen: serverTimestamp(),
        online: false,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
        return;
      }

      markOffline();
    };
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }

      removePlayerWithKeepalive({ roomId, uid, idToken: cachedIdToken });
      void removePlayerAndDeleteEmptyRoom(roomId, uid);
    };
    const refreshIdToken = () => {
      void getFirebaseAuth()
        .currentUser?.getIdToken()
        .then((token) => {
          cachedIdToken = token;
        })
        .catch(() => {
          cachedIdToken = null;
        });
    };

    await update(playerRef, {
      lastSeen: serverTimestamp(),
      online: true,
    });
    await disconnectOperation.update({
      lastSeen: serverTimestamp(),
      online: false,
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", markOnline);
    window.addEventListener("focus", refreshIdToken);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", markOnline);
      window.removeEventListener("focus", refreshIdToken);
      window.removeEventListener("pagehide", handlePageHide);
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
