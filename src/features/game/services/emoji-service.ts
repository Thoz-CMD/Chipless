import { ref, push, onChildAdded, off, remove, query, orderByChild, startAt } from "firebase/database";
import { getRealtimeDatabase } from "@/lib/firebase/client";
import type { EmojiType, EmojiReaction } from "@/features/game/emoji-reactions";

/**
 * Send an emoji reaction to a room
 */
export async function sendEmoji(
  roomId: string,
  emoji: EmojiType,
  fromUid: string,
  fromName: string,
  toUid?: string,
  position?: { x: number; y: number }
): Promise<void> {
  const database = getRealtimeDatabase();
  const emojiRef = ref(database, `roomEmojis/${roomId}`);
  
  const emojiData: Record<string, any> = {
    emoji,
    fromUid,
    fromName,
    timestamp: Date.now(),
  };

  // Only add optional fields if they have values
  if (toUid !== undefined) {
    emojiData.toUid = toUid;
  }
  if (position?.x !== undefined) {
    emojiData.x = position.x;
  }
  if (position?.y !== undefined) {
    emojiData.y = position.y;
  }

  await push(emojiRef, emojiData);
}

/**
 * Subscribe to emoji reactions in a room
 * Auto-cleanup: removes emojis older than 5 seconds
 */
export function subscribeToEmojis(
  roomId: string,
  onEmoji: (reaction: EmojiReaction) => void
): () => void {
  const database = getRealtimeDatabase();
  const emojiRef = ref(database, `roomEmojis/${roomId}`);
  
  // Only listen to recent emojis (last 5 seconds)
  const recentTime = Date.now() - 5000;
  const recentQuery = query(
    emojiRef,
    orderByChild("timestamp"),
    startAt(recentTime)
  );

  const handleNewEmoji = (snapshot: any) => {
    const data = snapshot.val();
    if (!data) return;

    const reaction: EmojiReaction = {
      id: snapshot.key!,
      emoji: data.emoji,
      fromUid: data.fromUid,
      fromName: data.fromName,
      toUid: data.toUid,
      timestamp: data.timestamp,
      x: data.x,
      y: data.y,
    };

    onEmoji(reaction);

    // Auto-delete after 3 seconds
    setTimeout(() => {
      const emojiItemRef = ref(database, `roomEmojis/${roomId}/${reaction.id}`);
      void remove(emojiItemRef);
    }, 3000);
  };

  onChildAdded(recentQuery, handleNewEmoji);

  // Cleanup function
  return () => {
    off(recentQuery, "child_added", handleNewEmoji);
  };
}

/**
 * Clean up old emojis from a room (older than 10 seconds)
 */
export async function cleanupOldEmojis(roomId: string): Promise<void> {
  const database = getRealtimeDatabase();
  const emojiRef = ref(database, `roomEmojis/${roomId}`);
  const cutoffTime = Date.now() - 10000; // 10 seconds ago
  
  const oldQuery = query(
    emojiRef,
    orderByChild("timestamp"),
    startAt(0)
  );

  // Note: In a real app, you'd iterate through and remove old ones
  // For simplicity, we're relying on the auto-delete in subscribeToEmojis
}
