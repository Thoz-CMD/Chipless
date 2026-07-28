import { get, ref, update } from "firebase/database";

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

  const playersSnapshot = await get(ref(database, `roomPlayers/${roomId}`));

  if (playersSnapshot.exists()) {
    return;
  }

  await update(ref(database), {
    [`rooms/${roomId}`]: null,
    [`roomSecrets/${roomId}`]: null,
  });
}
