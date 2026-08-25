import { get, ref, remove } from "firebase/database";

import { getRealtimeDatabase } from "@/lib/firebase/client";

const emptyRoomCleanupDelayMs = 1_500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function cleanupEmptyRoom(roomId: string): Promise<void> {
  const database = getRealtimeDatabase();

  await wait(emptyRoomCleanupDelayMs);

  const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
  const roomValue = roomSnapshot.val();

  if (!roomValue || typeof roomValue !== "object") {
    return;
  }

  const room = roomValue as Record<string, unknown>;

  const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));

  if (playersSnapshot.exists()) {
    return;
  }

  await remove(ref(database, `roomSecrets/${roomId}`));
  await remove(ref(database, `rooms/${roomId}`));
}
