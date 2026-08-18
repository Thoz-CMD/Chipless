import type { HandSettlement } from "@/features/rooms/services/settle-hand";

/**
 * Calculates the current active consecutive win streak on the table.
 * Returns a record mapping winner UID to their active win streak count.
 */
export function getActiveWinStreaks(
  settlements: Record<string, HandSettlement>,
): Record<string, number> {
  const settlementList = Object.values(settlements).sort(
    (first, second) => Number(second.handNumber) - Number(first.handNumber),
  );

  if (settlementList.length === 0) {
    return {};
  }

  const latestWinnerUid = settlementList[0]?.winnerUid;

  if (!latestWinnerUid) {
    return {};
  }

  let streak = 0;

  for (const settlement of settlementList) {
    if (settlement.winnerUid === latestWinnerUid) {
      streak += 1;
    } else {
      break;
    }
  }

  return {
    [latestWinnerUid]: streak,
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
  const settlementList = Object.values(settlements).sort(
    (first, second) => Number(first.handNumber) - Number(second.handNumber),
  );

  let runningStreak = 0;
  let maxStreak = 0;

  for (const settlement of settlementList) {
    if (settlement.winnerUid === targetUid) {
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
