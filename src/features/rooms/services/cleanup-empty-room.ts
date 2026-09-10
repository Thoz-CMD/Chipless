import { get, ref, remove } from "firebase/database";

import { getRealtimeDatabase } from "@/lib/firebase/client";

const emptyRoomCleanupDelayMs = 1_500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function cleanupEmptyRoom(roomId: string): Promise<void> {
  try {
    const database = getRealtimeDatabase();

    await wait(emptyRoomCleanupDelayMs);

    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const roomValue = roomSnapshot.val();

    if (!roomValue || typeof roomValue !== "object") {
      return;
    }

    const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));

    if (playersSnapshot.exists()) {
      return;
    }

    try {
      await remove(ref(database, `roomSecrets/${roomId}`));
    } catch {
      // Ignore if non-host client cannot delete secrets
    }

    // ⚠️ CRITICAL FIX: Don't try to delete roomPlayerHistory
    // Each player's history should only be deleted by themselves due to security rules:
    // roomPlayerHistory/$roomId/$uid/.write = "auth != null && $uid === auth.uid"
    // Attempting to delete the entire roomPlayerHistory/${roomId} path will fail
    // if it contains entries for other users that the current user can't delete
    console.log('Skipping roomPlayerHistory cleanup to avoid permission errors');

    try {
      await remove(ref(database, `rooms/${roomId}`));
    } catch {
      // Ignore - room might be protected or user might not be host
    }
  } catch {
    // Top-level catch to guarantee cleanupEmptyRoom never throws
  }
}
