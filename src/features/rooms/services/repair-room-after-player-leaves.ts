import { get, ref, serverTimestamp, update } from "firebase/database";

import {
  createHoldemGameState,
  isHoldemGameState,
} from "@/features/game/logic/texas-holdem";
import type { RoomPlayerRecord } from "@/features/rooms/services/player-record";
import { snapshotValueToOrderedPlayers } from "@/features/rooms/services/room-player-order";
import { getRealtimeDatabase } from "@/lib/firebase/client";

type RoomRecord = {
  hostUid: string;
  status: "waiting" | "playing";
  settings: {
    bigBlind: number;
  };
  gameState?: {
    currentBigBlindUid?: string;
    handNumber?: number;
    hand?: unknown;
  };
};

function isRoomRecord(value: unknown): value is RoomRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  const settings = room.settings as Record<string, unknown> | undefined;
  const gameState = room.gameState as Record<string, unknown> | undefined;

  return (
    typeof room.hostUid === "string" &&
    (room.status === "waiting" || room.status === "playing") &&
    Boolean(settings) &&
    typeof settings?.bigBlind === "number" &&
    (gameState === undefined ||
      ((gameState.currentBigBlindUid === undefined ||
        typeof gameState.currentBigBlindUid === "string") &&
        (gameState.handNumber === undefined ||
          typeof gameState.handNumber === "number") &&
        (gameState.hand === undefined || isHoldemGameState(gameState.hand))))
  );
}

function getNextHostUid(
  room: RoomRecord,
  remainingPlayers: RoomPlayerRecord[],
): string | null {
  if (remainingPlayers.some((player) => player.uid === room.hostUid)) {
    return room.hostUid;
  }

  return remainingPlayers[0]?.uid ?? null;
}

function getNextBigBlindUid(
  room: RoomRecord,
  allPlayers: RoomPlayerRecord[],
  remainingPlayers: RoomPlayerRecord[],
): string | null {
  const currentBigBlindUid =
    room.gameState?.currentBigBlindUid ?? room.hostUid;

  if (remainingPlayers.some((player) => player.uid === currentBigBlindUid)) {
    return currentBigBlindUid;
  }

  const oldIndex = allPlayers.findIndex(
    (player) => player.uid === currentBigBlindUid,
  );

  if (oldIndex < 0) {
    return remainingPlayers[0]?.uid ?? null;
  }

  for (let offset = 1; offset <= allPlayers.length; offset += 1) {
    const candidate = allPlayers[(oldIndex + offset) % allPlayers.length];

    if (remainingPlayers.some((player) => player.uid === candidate.uid)) {
      return candidate.uid;
    }
  }

  return remainingPlayers[0]?.uid ?? null;
}

function getDealerPositionForBigBlind(
  players: RoomPlayerRecord[],
  bigBlindUid: string,
): number {
  const bigBlindPosition = players.findIndex(
    (player) => player.uid === bigBlindUid,
  );

  if (bigBlindPosition < 0) {
    return 0;
  }

  return players.length === 2
    ? (bigBlindPosition + 1) % players.length
    : (bigBlindPosition - 2 + players.length) % players.length;
}

export async function repairRoomAfterPlayerLeaves({
  roomId,
  leavingUid,
}: {
  roomId: string;
  leavingUid: string;
}): Promise<void> {
  const database = getRealtimeDatabase();
  const [roomSnapshot, playersSnapshot] = await Promise.all([
    get(ref(database, `rooms/${roomId}`)),
    get(ref(database, `roomPlayers/${roomId}`)),
  ]);
  const roomValue: unknown = roomSnapshot.val();

  if (!isRoomRecord(roomValue)) {
    return;
  }

  const allPlayers = snapshotValueToOrderedPlayers(playersSnapshot.val());
  const remainingPlayers = allPlayers.filter(
    (player) => player.uid !== leavingUid,
  );

  if (remainingPlayers.length === 0) {
    return;
  }

  const nextHostUid = getNextHostUid(roomValue, remainingPlayers);

  if (!nextHostUid) {
    return;
  }

  const nextBigBlindUid =
    getNextBigBlindUid(roomValue, allPlayers, remainingPlayers) ?? nextHostUid;
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/hostUid`]: nextHostUid,
    [`roomSecrets/${roomId}/hostUid`]: nextHostUid,
    [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
  };

  if (roomValue.gameState?.handNumber !== undefined) {
    updates[`rooms/${roomId}/gameState/currentBigBlindUid`] = nextBigBlindUid;
  }

  if (roomValue.status === "playing") {
    if (remainingPlayers.length < 2) {
      updates[`rooms/${roomId}/status`] = "waiting";
      updates[`rooms/${roomId}/gameState/hand`] = null;
      updates[`rooms/${roomId}/gameState/currentBigBlindUid`] =
        nextBigBlindUid;
    } else {
      const dealerPosition = getDealerPositionForBigBlind(
        remainingPlayers,
        nextBigBlindUid,
      );
      const nextHand = createHoldemGameState({
        players: remainingPlayers.map((player, seatIndex) => ({
          uid: player.uid,
          displayName: player.displayName ?? "Unnamed",
          seatIndex,
        })),
        dealerPosition,
        bigBlind: roomValue.settings.bigBlind,
      });

      updates[`rooms/${roomId}/gameState/currentBigBlindUid`] =
        nextBigBlindUid;
      updates[`rooms/${roomId}/gameState/hand`] = nextHand;
    }
  }

  await update(ref(database), updates);
}
