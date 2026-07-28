import { FirebaseError } from "firebase/app";
import { off, onValue, ref } from "firebase/database";

import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getRealtimeDatabase } from "@/lib/firebase/client";

export type RoomPlayerListItem = RoomPlayerRecord;
export type RoomPlayersUpdateHandler = (players: RoomPlayerListItem[]) => void;
export type RoomPlayersErrorHandler = (error: Error) => void;

export class SubscribeRoomPlayersError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "SubscribeRoomPlayersError";
    this.code = options?.code;
  }
}

function getJoinedAtValue(player: RoomPlayerListItem): number {
  return player.joinedAt ?? 0;
}

function sortRoomPlayers(
  first: RoomPlayerListItem,
  second: RoomPlayerListItem,
): number {
  if (first.role === "host" && second.role !== "host") {
    return -1;
  }

  if (first.role !== "host" && second.role === "host") {
    return 1;
  }

  if (first.online !== second.online) {
    return first.online ? -1 : 1;
  }

  return getJoinedAtValue(first) - getJoinedAtValue(second);
}

function snapshotToPlayers(value: unknown): RoomPlayerListItem[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter(isRoomPlayerRecord)
    .sort(sortRoomPlayers);
}

export function subscribeRoomPlayers(
  roomId: string,
  onUpdate: RoomPlayersUpdateHandler,
  onError: RoomPlayersErrorHandler,
): () => void {
  const playersRef = ref(getRealtimeDatabase(), `roomPlayers/${roomId}`);

  onValue(
    playersRef,
    (snapshot) => {
      onUpdate(snapshotToPlayers(snapshot.val()));
    },
    (error) => {
      if (error instanceof FirebaseError) {
        onError(
          new SubscribeRoomPlayersError(error.message, {
            cause: error,
            code: error.code,
          }),
        );
        return;
      }

      onError(error);
    },
  );

  return () => {
    off(playersRef);
  };
}
