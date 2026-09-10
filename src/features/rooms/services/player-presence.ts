import { FirebaseError } from "firebase/app";
import {
  get,
  onDisconnect,
  ref,
  remove,
  update,
} from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
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

  // Sign in anonymously and wait for auth state to be established
  await signInWithAnonymousAccount();
  
  // Wait for auth state to be properly established using a Promise
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Authentication timeout"));
    }, 5000); // 5 second timeout

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user.uid);
      }
    });
  });
}

async function removePlayerAndDeleteEmptyRoom(
  roomId: string,
  uid: string,
): Promise<void> {
  const database = getRealtimeDatabase();

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
      (await getFirebaseAuth()
        .currentUser?.getIdToken()
        .catch(() => null)) ?? null;
    const database = getRealtimeDatabase();
    const playerRef = ref(database, `roomPlayers/${roomId}/${uid}`);
    
    // Create a fresh disconnect operation
    const disconnectOperation = onDisconnect(playerRef);
    let disconnectOperationActive = false;
    
    const markOnline = () => {
      // Only update if we're still authenticated as the same user
      const auth = getFirebaseAuth();
      if (auth.currentUser?.uid === uid) {
        void update(playerRef, {
          lastSeen: Date.now(),
          online: true,
        }).catch((error) => {
          // Only log if it's not a permission error (which is expected after removal)
          if (!error?.message?.includes('PERMISSION_DENIED')) {
            console.error('Failed to mark online:', error);
          }
        });
      }
    };
    const markOffline = () => {
      // Only update if we're still authenticated as the same user
      const auth = getFirebaseAuth();
      if (auth.currentUser?.uid === uid) {
        void update(playerRef, {
          lastSeen: Date.now(),
          online: false,
        }).catch((error) => {
          // Only log if it's not a permission error (which is expected after removal)
          if (!error?.message?.includes('PERMISSION_DENIED')) {
            console.error('Failed to mark offline:', error);
          }
        });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
        return;
      }

      markOffline();
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

    // Set player as online
    await update(playerRef, {
      lastSeen: Date.now(),
      online: true,
    });
    
    // Set up disconnect handler - mark offline but DON'T delete
    await disconnectOperation.update({
      lastSeen: Date.now(),
      online: false,
    });
    disconnectOperationActive = true;
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", markOnline);
    window.addEventListener("focus", refreshIdToken);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", markOnline);
      window.removeEventListener("focus", refreshIdToken);
      
      // Only cancel if it was actually set up
      if (disconnectOperationActive) {
        void disconnectOperation.cancel().catch(() => {
          // Ignore cancel errors
        });
      }
      
      // Only mark offline if we're still authenticated and the player record still exists
      // This prevents PERMISSION_DENIED errors when auth state is uncertain
      const auth = getFirebaseAuth();
      if (auth.currentUser?.uid === uid) {
        get(ref(database, `roomPlayers/${roomId}/${uid}`))
          .then((snapshot) => {
            // Only update if the record exists and we're still the same user
            if (snapshot.exists() && auth.currentUser?.uid === uid) {
              markOffline();
            }
          })
          .catch(() => {
            // Ignore errors on cleanup - this is expected if the user was already removed
            // or if there are permission issues
          });
      }
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
