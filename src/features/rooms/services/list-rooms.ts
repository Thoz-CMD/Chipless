import { FirebaseError } from "firebase/app";
import {
  get,
  off,
  onValue,
  ref,
  type DataSnapshot,
  type DatabaseReference,
} from "firebase/database";

import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import { cleanupEmptyRoom } from "@/features/rooms/services/cleanup-empty-room";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export type WaitingRoomListItem = {
  id: string;
  name: string;
  status: "waiting" | "playing";
  bigBlind: number;
  playerCount: number;
};

type RoomValue = {
  id: string;
  name: string;
  status: "waiting" | "playing";
  settings: {
    bigBlind: number;
  };
};

type RoomsById = Record<string, RoomValue>;
type PlayerCountsByRoomId = Record<string, number>;
type RoomsUpdateHandler = (rooms: WaitingRoomListItem[]) => void;
type RoomsErrorHandler = (error: Error) => void;
type Unsubscribe = () => void;
type PlayerListener = {
  ref: DatabaseReference;
};

export class ListRoomsError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "ListRoomsError";
    this.code = options?.code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isRoomValue(value: unknown): value is RoomValue {
  if (!isRecord(value)) {
    return false;
  }

  const settings = value.settings;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.status === "waiting" || value.status === "playing") &&
    isRecord(settings) &&
    typeof settings.bigBlind === "number"
  );
}

function snapshotToRooms(snapshot: DataSnapshot): RoomsById {
  const value: unknown = snapshot.val();

  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<RoomsById>((rooms, [roomId, room]) => {
    if (isRoomValue(room)) {
      rooms[roomId] = room;
    }

    return rooms;
  }, {});
}

function snapshotToPlayerCount(snapshot: DataSnapshot): number {
  const value: unknown = snapshot.val();

  if (!isRecord(value)) {
    return 0;
  }

  return Object.keys(value).length;
}

function toWaitingRoomList(
  roomsById: RoomsById,
  playerCountsByRoomId: PlayerCountsByRoomId,
): WaitingRoomListItem[] {
  return Object.values(roomsById)
    .filter((room) => (playerCountsByRoomId[room.id] ?? 0) > 0)
    .map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      bigBlind: room.settings.bigBlind,
      playerCount: playerCountsByRoomId[room.id] ?? 0,
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

async function ensureAnonymousAuth(): Promise<void> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return;
  }

  await signInWithAnonymousAccount();
}

export async function subscribeToWaitingRooms(
  onUpdate: RoomsUpdateHandler,
  onError: RoomsErrorHandler,
): Promise<Unsubscribe> {
  try {
    await ensureAnonymousAuth();

    const database = getRealtimeDatabase();
    const roomsRef = ref(database, "rooms");
    let latestRooms: RoomsById = {};
    let latestPlayerCounts: PlayerCountsByRoomId = {};
    let roomsVersion = 0;
    const playerListeners = new Map<string, PlayerListener>();
    const pendingEmptyRoomCleanupIds = new Set<string>();

    const emitUpdate = () => {
      onUpdate(toWaitingRoomList(latestRooms, latestPlayerCounts));
    };

    const handleError = (error: Error) => {
      if (error instanceof FirebaseError) {
        onError(
          new ListRoomsError(error.message, {
            cause: error,
            code: error.code,
          }),
        );
        return;
      }

      onError(error);
    };

    const syncPlayerListeners = () => {
      const waitingRoomIds = new Set(Object.keys(latestRooms));

      for (const [roomId, listener] of playerListeners) {
        if (!waitingRoomIds.has(roomId)) {
          off(listener.ref);
          playerListeners.delete(roomId);

          const nextPlayerCounts = { ...latestPlayerCounts };
          delete nextPlayerCounts[roomId];
          latestPlayerCounts = nextPlayerCounts;
        }
      }

      for (const roomId of waitingRoomIds) {
        if (playerListeners.has(roomId)) {
          continue;
        }

        const playerRef = ref(database, `roomPlayers/${roomId}`);

        playerListeners.set(roomId, { ref: playerRef });

        onValue(
          playerRef,
          (snapshot) => {
            const playerCount = snapshotToPlayerCount(snapshot);

            latestPlayerCounts = {
              ...latestPlayerCounts,
              [roomId]: playerCount,
            };
            emitUpdate();

            if (playerCount === 0 && !pendingEmptyRoomCleanupIds.has(roomId)) {
              pendingEmptyRoomCleanupIds.add(roomId);
              void cleanupEmptyRoom(roomId)
                .catch(() => {
                  // Ignore cleanup errors in background so it never disrupts room list
                })
                .finally(() => {
                  pendingEmptyRoomCleanupIds.delete(roomId);
                });
            }
          },
          handleError,
        );
      }
    };

    const seedPlayerCounts = async (version: number) => {
      const roomIds = Object.keys(latestRooms);

      if (roomIds.length === 0) {
        latestPlayerCounts = {};
        emitUpdate();
        return;
      }

      const countEntries = await Promise.all(
        roomIds.map(async (roomId) => {
          const snapshot = await get(ref(database, `roomPlayers/${roomId}`));

          return [roomId, snapshotToPlayerCount(snapshot)] as const;
        }),
      );

      if (version !== roomsVersion) {
        return;
      }

      latestPlayerCounts = {
        ...latestPlayerCounts,
        ...Object.fromEntries(countEntries),
      };
      emitUpdate();
    };

    onValue(
      roomsRef,
      (snapshot) => {
        roomsVersion += 1;
        latestRooms = snapshotToRooms(snapshot);
        syncPlayerListeners();
        void seedPlayerCounts(roomsVersion).catch(handleError);
      },
      handleError,
    );

    return () => {
      off(roomsRef);

      for (const listener of playerListeners.values()) {
        off(listener.ref);
      }

      playerListeners.clear();
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load rooms. Please try again.";
    const code =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;

    throw new ListRoomsError(message, { cause: error, code });
  }
}

export async function getWaitingRoomById(
  roomId: string,
): Promise<WaitingRoomListItem | null> {
  try {
    await ensureAnonymousAuth();

    const normalizedRoomId = roomId.trim().toUpperCase();
    const database = getRealtimeDatabase();
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${normalizedRoomId}`)),
      get(ref(database, `roomPlayers/${normalizedRoomId}`)),
    ]);
    const roomValue: unknown = roomSnapshot.val();

    if (!roomSnapshot.exists() || !isRoomValue(roomValue)) {
      return null;
    }

    return {
      id: roomValue.id,
      name: roomValue.name,
      status: roomValue.status,
      bigBlind: roomValue.settings.bigBlind,
      playerCount: snapshotToPlayerCount(playersSnapshot),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load room. Please try again.";
    const code =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;

    throw new ListRoomsError(message, { cause: error, code });
  }
}
