import { getDatabase, ref, onValue, off, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import type { GameHistoryData } from "./save-game-history";

export type GameHistoryListItem = GameHistoryData & {
  historyKey: string;
};

const GAME_HISTORY_RETENTION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Clean up old game history entries (older than 7 days)
 * Only call this for the current authenticated user
 */
async function cleanupOldHistory(userId: string, historyData: Record<string, GameHistoryData>): Promise<void> {
  const now = Date.now();
  const cutoffTime = now - (GAME_HISTORY_RETENTION_DAYS * MS_PER_DAY);
  const db = getDatabase();

  // ⚠️ CRITICAL: Only cleanup if we're the same user to avoid permission denied
  const auth = getAuth();
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.log('Skipping cleanup - not authenticated as target user');
    return;
  }

  const keysToDelete: string[] = [];

  Object.entries(historyData).forEach(([key, value]) => {
    if (value.endedAt < cutoffTime) {
      keysToDelete.push(key);
    }
  });

  // Delete old entries only if we're still the same authenticated user
  for (const key of keysToDelete) {
    try {
      // Double-check auth before each delete operation
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        console.log('Auth changed during cleanup, stopping');
        break;
      }
      
      await remove(ref(db, `gameHistory/${userId}/${key}`));
      console.log(`Deleted old history entry ${key} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to delete old history entry ${key}:`, error);
      // Don't continue if we get permission errors
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        console.log('Permission denied during cleanup, stopping');
        break;
      }
    }
  }

  if (keysToDelete.length > 0) {
    console.log(`Cleaned up ${keysToDelete.length} old history entries for user ${userId}`);
  }
}

/**
 * Subscribe to user's game history
 */
export function subscribeGameHistory(
  userId: string,
  callback: (history: GameHistoryListItem[]) => void,
): () => void {
  const db = getDatabase();
  const historyRef = ref(db, `gameHistory/${userId}`);

  const handleValue = (snapshot: ReturnType<typeof onValue> extends void ? never : Parameters<Parameters<typeof onValue>[1]>[0]) => {
    const data = snapshot.val();
    
    if (!data) {
      callback([]);
      return;
    }

    const historyList: GameHistoryListItem[] = Object.entries(data).map(
      ([key, value]) => ({
        ...(value as GameHistoryData),
        historyKey: key,
      }),
    );

    // Sort by endedAt descending (newest first)
    historyList.sort((a, b) => b.endedAt - a.endedAt);

    callback(historyList);

    // Clean up old entries in the background
    void cleanupOldHistory(userId, data as Record<string, GameHistoryData>);
  };

  onValue(historyRef, handleValue);

  return () => {
    off(historyRef, "value", handleValue);
  };
}
