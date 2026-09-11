import { ref, push, onChildAdded, off, remove, query, limitToLast } from "firebase/database";
import { getRealtimeDatabase } from "@/lib/firebase/client";

export type TipNotificationData = {
  fromUid: string;
  fromName: string;
  toUid: string;
  amount: number;
  timestamp: number;
};

/**
 * Send a tip notification
 */
export async function sendTipNotification(
  roomId: string,
  fromUid: string,
  fromName: string,
  toUid: string,
  amount: number
): Promise<void> {
  const database = getRealtimeDatabase();
  const tipNotifRef = ref(database, `roomTipNotifications/${roomId}`);
  
  const tipData: TipNotificationData = {
    fromUid,
    fromName,
    toUid,
    amount,
    timestamp: Date.now(),
  };

  await push(tipNotifRef, tipData);
}

/**
 * Subscribe to tip notifications for all players in the room
 */
export function subscribeToTipNotifications(
  roomId: string,
  currentUid: string,
  onTipReceived: (data: TipNotificationData & { id: string }) => void
): () => void {
  const database = getRealtimeDatabase();
  const tipNotifRef = ref(database, `roomTipNotifications/${roomId}`);
  const tipQuery = query(tipNotifRef, limitToLast(10));

  const handleChildAdded = (snapshot: any) => {
    const data = snapshot.val() as TipNotificationData;
    
    console.log("[tip-notification] Received notification:", {
      currentUid,
      notificationData: data,
      snapshotKey: snapshot.key,
    });
    
    if (data) {
      // Check if this is a new notification (within last 10 seconds)
      const isRecent = Date.now() - data.timestamp < 10000;
      
      if (isRecent) {
        console.log("[tip-notification] Triggering callback for:", currentUid);
        onTipReceived({
          ...data,
          id: snapshot.key,
        });

        // Remove the notification after 10 seconds to keep the database clean
        setTimeout(() => {
          const notifRef = ref(database, `roomTipNotifications/${roomId}/${snapshot.key}`);
          remove(notifRef).catch(console.error);
        }, 10000);
      }
    }
  };

  onChildAdded(tipQuery, handleChildAdded);

  return () => {
    off(tipQuery, "child_added", handleChildAdded);
  };
}
