import { getDatabase, ref, onValue, off } from "firebase/database";
import type { GameHistoryData } from "./save-game-history";

export type GameHistoryListItem = GameHistoryData & {
  historyKey: string;
};

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
  };

  onValue(historyRef, handleValue);

  return () => {
    off(historyRef, "value", handleValue);
  };
}
