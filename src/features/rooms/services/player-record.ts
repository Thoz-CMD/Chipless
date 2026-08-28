export type RoomPlayerRole = "host" | "player";

export type RoomPlayerRecord = {
  uid: string;
  displayName?: string;
  photoUrl?: string;
  role: RoomPlayerRole;
  joinedAt?: number;
  lastSeen?: number;
  seatIndex?: number;
  online: boolean;
  pendingLeave?: boolean;
};

export function isRoomPlayerRecord(value: unknown): value is RoomPlayerRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const player = value as Record<string, unknown>;

  return (
    typeof player.uid === "string" &&
    (player.displayName === undefined ||
      typeof player.displayName === "string") &&
    (player.photoUrl === undefined || typeof player.photoUrl === "string") &&
    (player.role === "host" || player.role === "player") &&
    (player.joinedAt === undefined || typeof player.joinedAt === "number") &&
    (player.lastSeen === undefined || typeof player.lastSeen === "number") &&
    (player.seatIndex === undefined || typeof player.seatIndex === "number") &&
    (player.pendingLeave === undefined ||
      typeof player.pendingLeave === "boolean") &&
    typeof player.online === "boolean"
  );
}

export function hasPlaceholderName(player: RoomPlayerRecord | null): boolean {
  const name = player?.displayName?.trim();

  return !name || name === "Host" || name === "Player";
}
