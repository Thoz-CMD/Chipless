import { get, ref, remove, update } from "firebase/database";

import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { repairRoomAfterPlayerLeaves } from "@/features/rooms/services/repair-room-after-player-leaves";
import { getRealtimeDatabase } from "@/lib/firebase/client";

export async function removeStaleRoomPlayer({
  roomId,
  uid,
}: {
  roomId: string;
  uid: string;
}): Promise<void> {
  const database = getRealtimeDatabase();

  // Try to save personal game history before removing player
  try {
    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const roomValue = roomSnapshot.val();

    if (roomValue && typeof roomValue === 'object') {
      const room = roomValue as Record<string, unknown>;
      const gameState = room.gameState as Record<string, unknown> | undefined;

      if (gameState && gameState.settlements && typeof gameState.settlements === 'object') {
        // ⚠️ CRITICAL FIX: Don't try to save game history for another user!
        // savePersonalGameHistory tries to write to gameHistory/${playerUid}/${historyKey}
        // but the current authenticated user might not be ${playerUid}, causing PERMISSION_DENIED
        // Security rule: gameHistory/$userId/.write = "auth != null && auth.uid === $userId"
        //
        // The player should save their own history when they leave, not when they're removed by others
        console.log(`Skipping game history save for user ${uid} to avoid permission denied error`);
      }
    }
  } catch (error) {
    console.error("Failed to save personal game history:", error);
    // Continue with removal even if history save fails
  }

  // Repair game state before removing player (transfer dealer/blind positions)
  try {
    await repairRoomAfterPlayerLeaves({ roomId, leavingUid: uid });
  } catch (error) {
    console.error("Failed to repair room after player leaves:", error);
    // Continue with removal even if repair fails
  }

  await remove(ref(database, `roomPlayers/${roomId}/${uid}`));
  await cleanupEmptyRoom(roomId);
}
