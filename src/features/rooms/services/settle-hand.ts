import { FirebaseError } from "firebase/app";
import { get, ref, serverTimestamp, update } from "firebase/database";

import {
  createHoldemGameState,
  isHoldemGameState,
  type HoldemGameState,
} from "@/features/game/logic/texas-holdem";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

export type HandSettlementPlayerResult = {
  uid: string;
  displayName: string;
  contribution: number;
  net: number;
  hasFolded?: boolean;
};

export type HandSettlement = {
  handNumber: number;
  winnerUid: string;
  winnerUids?: string[];
  winnerName: string;
  pot: number;
  playerResults: Record<string, HandSettlementPlayerResult>;
  createdAt?: number;
  correctedAt?: number;
  correctedBy?: string;
  previousWinnerUid?: string;
  previousWinnerUids?: string[];
  previousWinnerName?: string;
};

type RoomGameState = {
  currentBigBlindUid?: string;
  handNumber?: number;
  hand?: unknown;
};

type RoomStateRecord = {
  hostUid: string;
  settings: {
    bigBlind: number;
  };
  gameState?: RoomGameState;
};

export class SettleHandError extends Error {
  readonly code?: string;

  constructor(message: string, options?: ErrorOptions & { code?: string }) {
    super(message, options);
    this.name = "SettleHandError";
    this.code = options?.code;
  }
}

function joinedAtValue(player: RoomPlayerRecord): number {
  return player.joinedAt ?? 0;
}

function snapshotToPlayers(value: unknown): RoomPlayerRecord[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value as Record<string, unknown>)
    .filter(isRoomPlayerRecord)
    .sort((first, second) => {
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
    });
}

function isRoomStateRecord(value: unknown): value is RoomStateRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  const settings = room.settings as Record<string, unknown> | undefined;
  const gameState = room.gameState as Record<string, unknown> | undefined;

  return (
    typeof room.hostUid === "string" &&
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

export function getSettlementWinnerUids(
  settlement: HandSettlement,
): readonly string[] {
  return settlement.winnerUids ?? [settlement.winnerUid];
}

function uniqueUids(uids: readonly string[]): string[] {
  return Array.from(new Set(uids.filter((uid) => uid.length > 0)));
}

function formatWinnerName(winnerNames: readonly string[]): string {
  return winnerNames.join(", ");
}

function assertNoFoldedWinners(
  winners: readonly { hasFolded?: boolean }[],
): void {
  if (winners.some((winner) => winner.hasFolded)) {
    throw new SettleHandError("Folded players cannot be selected as winner.", {
      code: "winner-folded",
    });
  }
}

function getSplitShares({
  pot,
  winnerUids,
}: {
  pot: number;
  winnerUids: readonly string[];
}): Map<string, number> {
  const baseShare = Math.floor(pot / winnerUids.length);
  let remaining = pot - baseShare * winnerUids.length;
  const shares = new Map<string, number>();

  winnerUids.forEach((uid) => {
    const extra = remaining > 0 ? 1 : 0;
    shares.set(uid, baseShare + extra);
    remaining -= extra;
  });

  return shares;
}

function createSettlement(
  hand: HoldemGameState,
  handNumber: number,
  winnerUidsInput: readonly string[],
): HandSettlement {
  const winnerUids = uniqueUids(winnerUidsInput);
  const winners = winnerUids.map((winnerUid) =>
    hand.players.find((player) => player.uid === winnerUid),
  );

  if (winnerUids.length === 0 || winners.some((winner) => !winner)) {
    throw new SettleHandError("Selected winner is not in this hand.", {
      code: "winner-not-found",
    });
  }

  const foundWinners = winners.filter((winner) => winner !== undefined);

  assertNoFoldedWinners(foundWinners);

  const splitShares = getSplitShares({ pot: hand.pot, winnerUids });
  const playerResults = hand.players.reduce<
    Record<string, HandSettlementPlayerResult>
  >((results, player) => {
    const contribution = player.totalContribution;
    const splitShare = splitShares.get(player.uid);

      results[player.uid] = {
        uid: player.uid,
        displayName: player.displayName,
        contribution,
        net:
          splitShare === undefined ? -contribution : splitShare - contribution,
        hasFolded: player.hasFolded,
      };

    return results;
  }, {});
  const winnerNames = foundWinners.map((winner) => winner.displayName);
  const primaryWinnerUid = winnerUids[0];

  return {
    handNumber,
    winnerUid: primaryWinnerUid,
    winnerUids,
    winnerName: formatWinnerName(winnerNames),
    pot: hand.pot,
    playerResults,
  };
}

function isHandSettlementPlayerResult(
  value: unknown,
): value is HandSettlementPlayerResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result.uid === "string" &&
    typeof result.displayName === "string" &&
    typeof result.contribution === "number" &&
    typeof result.net === "number" &&
    (result.hasFolded === undefined || typeof result.hasFolded === "boolean")
  );
}

function isHandSettlement(value: unknown): value is HandSettlement {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settlement = value as Record<string, unknown>;
  const playerResults = settlement.playerResults;

  if (!playerResults || typeof playerResults !== "object") {
    return false;
  }

  return (
    typeof settlement.handNumber === "number" &&
    typeof settlement.winnerUid === "string" &&
    (settlement.winnerUids === undefined ||
      (Array.isArray(settlement.winnerUids) &&
        settlement.winnerUids.every((uid) => typeof uid === "string"))) &&
    typeof settlement.winnerName === "string" &&
    typeof settlement.pot === "number" &&
    Object.values(playerResults).every(isHandSettlementPlayerResult)
  );
}

function recalculateSettlementWinners(
  settlement: HandSettlement,
  winnerUidsInput: readonly string[],
): HandSettlement {
  const winnerUids = uniqueUids(winnerUidsInput);
  const winnerResults = winnerUids.map(
    (winnerUid) => settlement.playerResults[winnerUid],
  );

  if (winnerUids.length === 0 || winnerResults.some((result) => !result)) {
    throw new SettleHandError("Selected winner is not in this hand.", {
      code: "winner-not-found",
    });
  }

  assertNoFoldedWinners(winnerResults);

  const splitShares = getSplitShares({ pot: settlement.pot, winnerUids });
  const playerResults = Object.values(settlement.playerResults).reduce<
    Record<string, HandSettlementPlayerResult>
  >((results, result) => {
    const splitShare = splitShares.get(result.uid);

    results[result.uid] = {
      ...result,
      net:
        splitShare === undefined
          ? -result.contribution
          : splitShare - result.contribution,
    };

    return results;
  }, {});
  const winnerNames = winnerResults.map(
    (winnerResult) => winnerResult?.displayName ?? "Player",
  );
  const primaryWinnerUid = winnerUids[0];

  return {
    ...settlement,
    winnerUid: primaryWinnerUid,
    winnerUids,
    winnerName: formatWinnerName(winnerNames),
    playerResults,
  };
}

export async function settleHand({
  roomId,
  winnerUid,
  winnerUids,
}: {
  roomId: string;
  winnerUid?: string;
  winnerUids?: string[];
}): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new SettleHandError("Please sign in before settling the hand.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const [roomSnapshot, playersSnapshot] = await Promise.all([
      get(ref(database, `rooms/${roomId}`)),
      get(ref(database, `roomPlayers/${roomId}`)),
    ]);
    const roomValue: unknown = roomSnapshot.val();

    if (!isRoomStateRecord(roomValue)) {
      throw new SettleHandError("Room state is incomplete.", {
        code: "room-invalid",
      });
    }

    if (roomValue.hostUid !== uid) {
      throw new SettleHandError("Only the host can settle the hand.", {
        code: "permission-denied",
      });
    }

    const hand = roomValue.gameState?.hand;

    if (!isHoldemGameState(hand)) {
      throw new SettleHandError("No active hand to settle.", {
        code: "hand-not-found",
      });
    }

    if (hand.bettingRound !== "showdown") {
      throw new SettleHandError("The hand is not ready for showdown.", {
        code: "hand-not-showdown",
      });
    }

    const handNumber = roomValue.gameState?.handNumber ?? 1;
    const selectedWinnerUids = winnerUids ?? (winnerUid ? [winnerUid] : []);
    const settlement = createSettlement(hand, handNumber, selectedWinnerUids);

    const summaryHand: HoldemGameState = {
      ...hand,
      bettingRound: "summary",
      currentTurn: -1,
    };

    await update(ref(database), {
      [`rooms/${roomId}/gameState/settlements/${handNumber}`]: {
        ...settlement,
        createdAt: serverTimestamp(),
      },
      [`rooms/${roomId}/gameState/hand`]: summaryHand,
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SettleHandError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can settle the hand."
          : error.message;

      throw new SettleHandError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new SettleHandError(error.message, { cause: error });
    }

    throw new SettleHandError("Unable to settle hand. Please try again.", {
      cause: error,
    });
  }
}

export async function correctHandWinner({
  roomId,
  handNumber,
  winnerUid,
  winnerUids,
}: {
  roomId: string;
  handNumber: number;
  winnerUid?: string;
  winnerUids?: string[];
}): Promise<void> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;

    if (!uid) {
      throw new SettleHandError("Please sign in before editing the winner.", {
        code: "unauthenticated",
      });
    }

    const database = getRealtimeDatabase();
    const [hostSnapshot, settlementsSnapshot, settlementSnapshot] =
      await Promise.all([
      get(ref(database, `rooms/${roomId}/hostUid`)),
      get(ref(database, `rooms/${roomId}/gameState/settlements`)),
      get(ref(database, `rooms/${roomId}/gameState/settlements/${handNumber}`)),
    ]);
    const hostUid: unknown = hostSnapshot.val();
    const settlementsValue: unknown = settlementsSnapshot.val();
    const settlementValue: unknown = settlementSnapshot.val();

    if (hostUid !== uid) {
      throw new SettleHandError("Only the host can edit the winner.", {
        code: "permission-denied",
      });
    }

    if (!settlementsValue || typeof settlementsValue !== "object") {
      throw new SettleHandError("Hand settlement is incomplete.", {
        code: "settlement-invalid",
      });
    }

    const latestHandNumber = Object.values(
      settlementsValue as Record<string, unknown>,
    )
      .filter(isHandSettlement)
      .reduce(
        (latest, settlement) => Math.max(latest, settlement.handNumber),
        0,
      );

    if (handNumber !== latestHandNumber) {
      throw new SettleHandError(
        "Only the latest finished hand can be edited.",
        {
          code: "not-latest-hand",
        },
      );
    }

    if (!isHandSettlement(settlementValue)) {
      throw new SettleHandError("Hand settlement is incomplete.", {
        code: "settlement-invalid",
      });
    }

    const selectedWinnerUids = uniqueUids(
      winnerUids ?? (winnerUid ? [winnerUid] : []),
    );
    const existingWinnerUids = getSettlementWinnerUids(settlementValue);

    if (
      existingWinnerUids.length === selectedWinnerUids.length &&
      existingWinnerUids.every(
        (existingWinnerUid, index) =>
          existingWinnerUid === selectedWinnerUids[index],
      )
    ) {
      return;
    }

    const correctedSettlement = recalculateSettlementWinners(
      settlementValue,
      selectedWinnerUids,
    );

    await update(ref(database), {
      [`rooms/${roomId}/gameState/settlements/${handNumber}`]: {
        ...correctedSettlement,
        correctedAt: serverTimestamp(),
        correctedBy: uid,
        previousWinnerUid: settlementValue.winnerUid,
        previousWinnerUids: [...existingWinnerUids],
        previousWinnerName: settlementValue.winnerName,
      },
      [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof SettleHandError) {
      throw error;
    }

    if (error instanceof FirebaseError) {
      const message =
        error.code === "PERMISSION_DENIED" || error.code === "permission-denied"
          ? "Only the host can edit the winner."
          : error.message;

      throw new SettleHandError(message, {
        cause: error,
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw new SettleHandError(error.message, { cause: error });
    }

    throw new SettleHandError("Unable to edit winner. Please try again.", {
      cause: error,
    });
  }
}
