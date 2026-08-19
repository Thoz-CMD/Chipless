import {
  getSettlementWinnerUids,
  type HandSettlement,
} from "@/features/rooms/services/settle-hand";

function sameWinnerSet(
  firstWinnerUids: readonly string[],
  secondWinnerUids: readonly string[],
): boolean {
  return (
    firstWinnerUids.length === secondWinnerUids.length &&
    firstWinnerUids.every((uid) => secondWinnerUids.includes(uid))
  );
}

function getSortedSettlements(
  settlements: Record<string, HandSettlement>,
): HandSettlement[] {
  return Object.values(settlements).sort(
    (first, second) => Number(second.handNumber) - Number(first.handNumber),
  );
}

/**
 * Calculates the current active consecutive win streak on the table.
 * Returns a record mapping winner UID to their active win streak count.
 */
export function getActiveWinStreaks(
  settlements: Record<string, HandSettlement>,
): Record<string, number> {
  const settlementList = getSortedSettlements(settlements);

  if (settlementList.length === 0) {
    return {};
  }

  const latestSettlement = settlementList[0];

  if (!latestSettlement) {
    return {};
  }

  const latestWinnerUids = getSettlementWinnerUids(latestSettlement);
  let streak = 0;

  for (const settlement of settlementList) {
    if (sameWinnerSet(getSettlementWinnerUids(settlement), latestWinnerUids)) {
      streak += 1;
    } else {
      break;
    }
  }

  return latestWinnerUids.reduce<Record<string, number>>((streaks, uid) => {
    streaks[uid] = streak;
    return streaks;
  }, {});
}

export type ExtinguishedWinStreak = {
  handNumber: number;
  winnerUids: readonly string[];
  extinguishedUids: readonly string[];
  extinguishedStreak: number;
};

/**
 * Finds the latest moment where a new winner stopped an active on-fire streak.
 */
export function getLatestExtinguishedWinStreak(
  settlements: Record<string, HandSettlement>,
): ExtinguishedWinStreak | null {
  const settlementList = getSortedSettlements(settlements);
  const latestSettlement = settlementList[0];
  const previousSettlement = settlementList[1];

  if (!latestSettlement || !previousSettlement) {
    return null;
  }

  const latestWinnerUids = getSettlementWinnerUids(latestSettlement);
  const previousWinnerUids = getSettlementWinnerUids(previousSettlement);

  if (sameWinnerSet(latestWinnerUids, previousWinnerUids)) {
    return null;
  }

  let extinguishedStreak = 0;

  for (const settlement of settlementList.slice(1)) {
    if (sameWinnerSet(getSettlementWinnerUids(settlement), previousWinnerUids)) {
      extinguishedStreak += 1;
    } else {
      break;
    }
  }

  if (extinguishedStreak < 2) {
    return null;
  }

  return {
    handNumber: latestSettlement.handNumber,
    winnerUids: latestWinnerUids,
    extinguishedUids: previousWinnerUids,
    extinguishedStreak,
  };
}

/**
 * Calculates both the active and maximum career/session win streak for a given player.
 */
export function getPlayerWinStreakStats(
  targetUid: string,
  settlements: Record<string, HandSettlement>,
): { currentStreak: number; maxStreak: number } {
  // Chronological order (Hand 1 -> Hand N)
  const settlementList = [...getSortedSettlements(settlements)].reverse();

  let runningStreak = 0;
  let maxStreak = 0;

  for (const settlement of settlementList) {
    if (getSettlementWinnerUids(settlement).includes(targetUid)) {
      runningStreak += 1;
      if (runningStreak > maxStreak) {
        maxStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  return {
    currentStreak: runningStreak,
    maxStreak,
  };
}
