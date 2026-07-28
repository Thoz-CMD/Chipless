import { ref, remove } from "firebase/database";

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

  await repairRoomAfterPlayerLeaves({ roomId, leavingUid: uid });
  await remove(ref(database, `roomPlayers/${roomId}/${uid}`));
  await cleanupEmptyRoom(roomId);
}
