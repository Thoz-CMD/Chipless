import { get, ref, serverTimestamp, update } from "firebase/database";

import {
  createHoldemGameState,
  isHoldemGameState,
} from "@/features/game/logic/texas-holdem";
import type { RoomPlayerRecord } from "@/features/rooms/services/player-record";
import { snapshotValueToOrderedPlayers } from "@/features/rooms/services/room-player-order";
import { getRealtimeDatabase } from "@/lib/firebase/client";

type HoldemPlayerState = {
  uid: string;
  displayName: string;
  seatIndex: number;
  stack: number;
  currentContribution: number;
  totalContribution: number;
  hasFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
};

type HoldemGameState = {
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  currentTurn: number;
  bettingRound: "preflop" | "flop" | "turn" | "river" | "showdown";
  pot: number;
  currentBet: number;
  minimumRaise: number;
  smallBlind: number;
  bigBlind: number;
  players: HoldemPlayerState[];
  communityCards?: string[];
  playerCards?: Record<string, readonly string[]>;
  actionLog?: unknown[];
  lastAggressorPosition?: number;
};

function normalizePosition(position: number, playerCount: number): number {
  return ((position % playerCount) + playerCount) % playerCount;
}

function nextActivePosition(
  state: HoldemGameState,
  fromPosition: number,
): number | undefined {
  const playerCount = state.players.length;

  for (let offset = 1; offset <= playerCount; offset += 1) {
    const position = normalizePosition(fromPosition + offset, playerCount);
    const player = state.players[position];

    if (player && !player.hasFolded && !player.isAllIn) {
      return position;
    }
  }

  return undefined;
}

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
  const currentBigBlindUid = room.gameState?.currentBigBlindUid ?? room.hostUid;

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

function getNextSmallBlindUid(
  bigBlindUid: string,
  allPlayers: RoomPlayerRecord[],
  remainingPlayers: RoomPlayerRecord[],
): string | null {
  // Small blind is the player before the big blind in the player order
  const bbIndex = allPlayers.findIndex((player) => player.uid === bigBlindUid);

  if (bbIndex < 0) {
    return remainingPlayers[0]?.uid ?? null;
  }

  const sbIndex = (bbIndex - 1 + allPlayers.length) % allPlayers.length;
  const sbPlayer = allPlayers[sbIndex];

  if (remainingPlayers.some((player) => player.uid === sbPlayer.uid)) {
    return sbPlayer.uid;
  }

  // If the calculated SB is not in remaining players, find the next one
  for (let offset = 1; offset <= allPlayers.length; offset += 1) {
    const candidate = allPlayers[(sbIndex + offset) % allPlayers.length];

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
  isKicked = false,
}: {
  roomId: string;
  leavingUid: string;
  isKicked?: boolean;
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

  // If the host is leaving, do not auto-transfer host here.
  // Host-driven room deletion should remove the room instead.
  if (leavingUid === roomValue.hostUid) {
    return;
  }

  const allPlayers = snapshotValueToOrderedPlayers(playersSnapshot.val());
  const remainingPlayers = allPlayers.filter(
    (player) => player.uid !== leavingUid,
  );

  if (remainingPlayers.length === 0) {
    return;
  }

  // If player is leaving voluntarily (not kicked), don't change game state
  // Just return - the player can rejoin normally
  if (!isKicked) {
    return;
  }

  // Only update game state if player was kicked
  const nextBigBlindUid =
    getNextBigBlindUid(roomValue, allPlayers, remainingPlayers) ?? roomValue.hostUid;
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
  };

  if (roomValue.gameState?.handNumber !== undefined) {
    updates[`rooms/${roomId}/gameState/currentBigBlindUid`] = nextBigBlindUid;
  }

  if (roomValue.status === "playing") {
    const currentHand = roomValue.gameState?.hand;

    if (!currentHand || !isHoldemGameState(currentHand)) {
      // No current hand, just update player list for next hand
      if (remainingPlayers.length < 2) {
        updates[`rooms/${roomId}/status`] = "waiting";
        updates[`rooms/${roomId}/gameState/hand`] = null;
        updates[`rooms/${roomId}/gameState/currentBigBlindUid`] = nextBigBlindUid;
      } else {
        const dealerPosition = getDealerPositionForBigBlind(
          remainingPlayers,
          nextBigBlindUid,
        );

        // Get player data from roomPlayers to include stack values
        const roomPlayersData = playersSnapshot.val();
        const playersWithStack = remainingPlayers.map((player, seatIndex) => {
          const playerData = roomPlayersData?.[player.uid];
          return {
            uid: player.uid,
            displayName: player.displayName ?? "Unnamed",
            seatIndex,
            stack: playerData?.stack || 1000, // Default stack if not found
          };
        });

        const nextHand = createHoldemGameState({
          players: playersWithStack,
          dealerPosition,
          bigBlind: roomValue.settings.bigBlind,
        });

        // If the kicked player was supposed to be BB, deduct BB from the new BB player
        const newBBPlayerIndex = nextHand.players.findIndex(
          (p: any) => p.uid === nextBigBlindUid,
        );

        if (newBBPlayerIndex >= 0) {
          const bbAmount = roomValue.settings.bigBlind;
          const newBBPlayer = nextHand.players[newBBPlayerIndex];

          // Deduct BB from new BB player's stack
          nextHand.players[newBBPlayerIndex] = {
            ...newBBPlayer,
            stack: Math.max(0, newBBPlayer.stack - bbAmount),
            currentContribution: bbAmount,
            totalContribution: (newBBPlayer.totalContribution || 0) + bbAmount,
            hasActed: true,
          };

          // Add BB to pot
          nextHand.pot = bbAmount;
        }

        updates[`rooms/${roomId}/gameState/currentBigBlindUid`] = nextBigBlindUid;
        updates[`rooms/${roomId}/gameState/hand`] = nextHand;
      }
    } else {
      // There's an active hand - check if the leaving player has contributed
      const leavingPlayerIndex = currentHand.players.findIndex(
        (p: any) => p.uid === leavingUid,
      );

      if (leavingPlayerIndex >= 0) {
        const leavingPlayer = currentHand.players[leavingPlayerIndex];

        // When kicked, always remove the player from the hand (don't mark as folded)
        // and transfer BB if they were the BB
        const updatedPlayers = currentHand.players.filter(
          (p: any) => p.uid !== leavingUid,
        );

        const activePlayerCount = updatedPlayers.filter(
          (p: any) => !p.hasFolded,
        ).length;

        if (activePlayerCount < 2) {
          // Not enough players to continue, end the hand
          updates[`rooms/${roomId}/status`] = "waiting";
          updates[`rooms/${roomId}/gameState/hand`] = null;
          updates[`rooms/${roomId}/gameState/currentBigBlindUid`] = nextBigBlindUid;
        } else {
          // Remove the player and adjust positions
          const updatedHand = {
            ...currentHand,
            players: updatedPlayers,
          };

          // Recalculate positions after removing a player
          if (currentHand.currentTurn > leavingPlayerIndex) {
            updatedHand.currentTurn = currentHand.currentTurn - 1;
          } else if (currentHand.currentTurn === leavingPlayerIndex) {
            const nextTurn = nextActivePosition(updatedHand, 0);
            if (nextTurn !== undefined) {
              updatedHand.currentTurn = nextTurn;
            }
          }

          // If the leaving player was supposed to be BB, transfer the BB obligation
          // Find the new BB player and deduct the BB amount from their stack
          const newBBPlayerIndex = updatedHand.players.findIndex(
            (p: any) => p.uid === nextBigBlindUid,
          );

          if (newBBPlayerIndex >= 0) {
            const bbAmount = currentHand.bigBlind;
            const newBBPlayer = updatedHand.players[newBBPlayerIndex];

            // Deduct BB from new BB player's stack
            updatedHand.players[newBBPlayerIndex] = {
              ...newBBPlayer,
              stack: Math.max(0, newBBPlayer.stack - bbAmount),
              currentContribution: bbAmount,
              totalContribution: (newBBPlayer.totalContribution || 0) + bbAmount,
              hasActed: true,
            };

            // Add BB to pot
            updatedHand.pot = (currentHand.pot || 0) + bbAmount;
          }

          updates[`rooms/${roomId}/gameState/hand`] = updatedHand;
        }
      }
    }
  }

  await update(ref(database), updates);
}
