import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";

function joinedAtValue(player: RoomPlayerRecord): number {
  return player.joinedAt ?? 0;
}

export function sortRoomPlayers(
  first: RoomPlayerRecord,
  second: RoomPlayerRecord,
): number {
  if (
    typeof first.seatIndex === "number" &&
    typeof second.seatIndex === "number"
  ) {
    return first.seatIndex - second.seatIndex;
  }

  if (typeof first.seatIndex === "number") {
    return -1;
  }

  if (typeof second.seatIndex === "number") {
    return 1;
  }

  return joinedAtValue(first) - joinedAtValue(second);
}

export function snapshotValueToOrderedPlayers(
  value: unknown,
): RoomPlayerRecord[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter(isRoomPlayerRecord)
    .sort(sortRoomPlayers);
}
