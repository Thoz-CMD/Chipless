import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

export type RoomLeaderboardRow = {
  rank: number;
  uid: string;
  displayName: string;
  photoUrl?: string;
  net: number;
  handsPlayed: number;
};

export function getRoomLeaderboard({
  settlements,
  players,
}: {
  settlements: Record<string, HandSettlement>;
  players: RoomPlayerListItem[];
}): RoomLeaderboardRow[] {
  const playerNamesByUid = new Map(players.map((p) => [p.uid, p.displayName]));
  const playerPhotosByUid = new Map(players.map((p) => [p.uid, p.photoUrl]));
  const totalsByUid = new Map<
    string,
    {
      net: number;
      handsPlayed: number;
      displayName: string;
      photoUrl?: string;
    }
  >();

  players.forEach((player) => {
    totalsByUid.set(player.uid, {
      net: 0,
      handsPlayed: 0,
      displayName: player.displayName ?? "Player",
      photoUrl: player.photoUrl,
    });
  });

  Object.values(settlements).forEach((settlement) => {
    Object.values(settlement.playerResults).forEach((result) => {
      const existing = totalsByUid.get(result.uid);
      const displayName =
        playerNamesByUid.get(result.uid) ??
        existing?.displayName ??
        result.displayName ??
        "Player";
      const photoUrl = playerPhotosByUid.get(result.uid) ?? existing?.photoUrl;

      totalsByUid.set(result.uid, {
        net: (existing?.net ?? 0) + result.net,
        handsPlayed:
          (existing?.handsPlayed ?? 0) +
          (result.contribution > 0 || result.net !== 0 ? 1 : 0),
        displayName,
        photoUrl,
      });
    });
  });

  const sorted = Array.from(totalsByUid.entries())
    .map(([uid, data]) => ({
      uid,
      displayName: data.displayName,
      photoUrl: data.photoUrl,
      net: data.net,
      handsPlayed: data.handsPlayed,
    }))
    .sort((first, second) => second.net - first.net);

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
