import { get, ref, remove, update, serverTimestamp } from "firebase/database";

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

  // Get current player data to preserve seat information
  const playerSnapshot = await get(ref(database, `roomPlayers/${roomId}/${uid}`));
  const playerData = playerSnapshot.val();

  // Store seat information in a separate location before removing player
  if (playerData && typeof playerData === 'object') {
    const seatIndex = playerData.seatIndex;
    const displayName = playerData.displayName;
    const photoUrl = playerData.photoUrl;
    const joinedAt = playerData.joinedAt;

    // Build update object with only defined values
    const updates: Record<string, unknown> = {};

    if (typeof seatIndex === 'number') {
      updates[`roomPlayerHistory/${roomId}/${uid}/seatIndex`] = seatIndex;
    }
    if (typeof displayName === 'string') {
      updates[`roomPlayerHistory/${roomId}/${uid}/displayName`] = displayName;
    }
    if (typeof photoUrl === 'string') {
      updates[`roomPlayerHistory/${roomId}/${uid}/photoUrl`] = photoUrl;
    }
    if (joinedAt !== undefined) {
      updates[`roomPlayerHistory/${roomId}/${uid}/joinedAt`] = joinedAt;
    }
    updates[`roomPlayerHistory/${roomId}/${uid}/lastSeen`] = serverTimestamp();

    // Only update if we have at least one field to update
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  }

  // Try to save personal game history before removing player
  try {
    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const roomValue = roomSnapshot.val();

    if (roomValue && typeof roomValue === 'object') {
      const room = roomValue as Record<string, unknown>;
      const gameState = room.gameState as Record<string, unknown> | undefined;

      if (gameState && gameState.settlements && typeof gameState.settlements === 'object') {
        const { savePersonalGameHistory } = await import("@/features/game-history/services/save-game-history");
        const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));
        const playersValue = playersSnapshot.val();

        if (playersValue && typeof playersValue === 'object') {
          const playersData = Object.values(playersValue).map((p: any) => ({
            uid: p.uid,
            displayName: p.displayName,
            photoUrl: p.photoUrl,
            role: p.role || 'player',
            online: p.online || false,
          }));

          // Save game history only for the player leaving
          await savePersonalGameHistory({
            roomData: {
              id: roomId,
              name: room.name as string,
              hostUid: room.hostUid as string,
              settings: room.settings as { bigBlind: number },
            },
            players: playersData,
            settlements: gameState.settlements as Record<string, any>,
            playerUid: uid,
          });
        }
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
