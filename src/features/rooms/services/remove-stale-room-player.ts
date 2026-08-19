import { ref, remove } from "firebase/database";

import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { getRealtimeDatabase } from "@/lib/firebase/client";

export async function removeStaleRoomPlayer({
  roomId,
  uid,
}: {
  roomId: string;
  uid: string;
}): Promise<void> {
  const database = getRealtimeDatabase();

  await remove(ref(database, `roomPlayers/${roomId}/${uid}`));
  await cleanupEmptyRoom(roomId);
}
