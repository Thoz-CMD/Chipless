import { getDatabase, ref, update, get } from "firebase/database";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

export type GameHistoryData = {
  roomId: string;
  roomName: string;
  createdAt: number;
  endedAt: number;
  hostUid: string;
  settings: {
    bigBlind: number;
  };
  players: Record<
    string,
    {
      uid: string;
      displayName: string;
      photoUrl?: string;
    }
  >;
  settlements: Record<string, HandSettlement>;
  finalStats: {
    totalHands: number;
    totalPlayers: number;
    topPlayer?: {
      uid: string;
      name: string;
      netGain: number;
    };
  };
};

export class SaveGameHistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveGameHistoryError";
  }
}

/**
 * Save game history when a room is deleted or game ends
 */
export async function saveGameHistory({
  roomData,
  players,
  settlements,
  currentUid,
}: {
  roomData: {
    id: string;
    name: string;
    hostUid: string;
    settings: { bigBlind: number };
  };
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  currentUid: string;
}): Promise<void> {
  try {
    const db = getDatabase();
    const timestamp = Date.now();
    const historyKey = `${roomData.id}-${timestamp}`;

    // Calculate final stats
    const totalHands = Object.keys(settlements).length;
    const netByPlayer = players.reduce<Record<string, number>>((acc, player) => {
      acc[player.uid] = 0;
      return acc;
    }, {});

    // Calculate net for each player
    Object.values(settlements).forEach((settlement) => {
      Object.entries(settlement.playerResults).forEach(([uid, result]) => {
        if (netByPlayer[uid] !== undefined) {
          netByPlayer[uid] += result.net;
        }
      });
    });

    // Find top player
    let topPlayer: GameHistoryData["finalStats"]["topPlayer"];
    let maxNet = -Infinity;
    Object.entries(netByPlayer).forEach(([uid, net]) => {
      if (net > maxNet) {
        maxNet = net;
        const player = players.find((p) => p.uid === uid);
        if (player) {
          topPlayer = {
            uid,
            name: player.displayName ?? "Unknown",
            netGain: net,
          };
        }
      }
    });

    // Prepare player data
    const playersData = players.reduce<GameHistoryData["players"]>(
      (acc, player) => {
        const playerData: {
          uid: string;
          displayName: string;
          photoUrl?: string;
        } = {
          uid: player.uid,
          displayName: player.displayName ?? "Unknown",
        };
        
        // Only include photoUrl if it exists
        if (player.photoUrl) {
          playerData.photoUrl = player.photoUrl;
        }
        
        acc[player.uid] = playerData;
        return acc;
      },
      {},
    );

    // Create history data
    const historyData: GameHistoryData = {
      roomId: roomData.id,
      roomName: roomData.name,
      createdAt: timestamp, // We don't have exact creation time, use current
      endedAt: timestamp,
      hostUid: roomData.hostUid,
      settings: {
        bigBlind: roomData.settings.bigBlind,
      },
      players: playersData,
      settlements,
      finalStats: {
        totalHands,
        totalPlayers: players.length,
        topPlayer,
      },
    };

    // Save game history for ALL players in the room
    // (each player will have their own copy of the game history)
    const updates = players.reduce<Record<string, unknown>>((acc, player) => {
      acc[`gameHistory/${player.uid}/${historyKey}`] = historyData;
      return acc;
    }, {});

    await update(ref(db), updates);
  } catch (error) {
    console.error("Failed to save game history:", error);
    throw new SaveGameHistoryError(
      error instanceof Error ? error.message : "Failed to save game history",
    );
  }
}

/**
 * Save personal game history when a player leaves a room
 * This saves only for the specific player leaving
 * Uses roomId as the key so it can be updated if the player re-joins and leaves again
 */
export async function savePersonalGameHistory({
  roomData,
  players,
  settlements,
  playerUid,
}: {
  roomData: {
    id: string;
    name: string;
    hostUid: string;
    settings: { bigBlind: number };
  };
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  playerUid: string;
}): Promise<void> {
  try {
    const db = getDatabase();
    const timestamp = Date.now();
    const historyKey = roomData.id; // Use roomId as key to allow updates

    // Calculate final stats
    const totalHands = Object.keys(settlements).length;
    const netByPlayer = players.reduce<Record<string, number>>((acc, player) => {
      acc[player.uid] = 0;
      return acc;
    }, {});

    // Calculate net for each player
    Object.values(settlements).forEach((settlement) => {
      Object.entries(settlement.playerResults).forEach(([uid, result]) => {
        if (netByPlayer[uid] !== undefined) {
          netByPlayer[uid] += result.net;
        }
      });
    });

    // Find top player
    let topPlayer: GameHistoryData["finalStats"]["topPlayer"];
    let maxNet = -Infinity;
    Object.entries(netByPlayer).forEach(([uid, net]) => {
      if (net > maxNet) {
        maxNet = net;
        const player = players.find((p) => p.uid === uid);
        if (player) {
          topPlayer = {
            uid,
            name: player.displayName ?? "Unknown",
            netGain: net,
          };
        }
      }
    });

    // Prepare player data
    const playersData = players.reduce<GameHistoryData["players"]>(
      (acc, player) => {
        const playerData: {
          uid: string;
          displayName: string;
          photoUrl?: string;
        } = {
          uid: player.uid,
          displayName: player.displayName ?? "Unknown",
        };

        // Only include photoUrl if it exists
        if (player.photoUrl) {
          playerData.photoUrl = player.photoUrl;
        }

        acc[player.uid] = playerData;
        return acc;
      },
      {},
    );

    // Check if history already exists to preserve createdAt
    const existingHistorySnapshot = await get(ref(db, `gameHistory/${playerUid}/${historyKey}`));
    const existingHistory = existingHistorySnapshot.val();

    // Create history data
    const historyData: GameHistoryData = {
      roomId: roomData.id,
      roomName: roomData.name,
      createdAt: existingHistory?.createdAt || timestamp, // Preserve original creation time
      endedAt: timestamp,
      hostUid: roomData.hostUid,
      settings: {
        bigBlind: roomData.settings.bigBlind,
      },
      players: playersData,
      settlements,
      finalStats: {
        totalHands,
        totalPlayers: players.length,
        topPlayer,
      },
    };

    // Save game history only for the specific player
    await update(ref(db, `gameHistory/${playerUid}/${historyKey}`), historyData);
  } catch (error) {
    console.error("Failed to save personal game history:", error);
    throw new SaveGameHistoryError(
      error instanceof Error ? error.message : "Failed to save personal game history",
    );
  }
}
