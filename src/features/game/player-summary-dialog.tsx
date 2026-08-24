"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crown,
  History,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPen,
  UserX,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "@/features/game/player-avatar";
import { getPlayerWinStreakStats } from "@/features/game/logic/win-streaks";
import {
  getSettlementWinnerUids,
  type HandSettlement,
} from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

function formatAmount(amount: number): string {
  const absoluteAmount = Math.abs(amount).toLocaleString("en-US");

  if (amount > 0) {
    return `+${absoluteAmount}`;
  }

  if (amount < 0) {
    return `-${absoluteAmount}`;
  }

  return "0";
}

type HeadToHeadRow = {
  uid: string;
  displayName: string;
  photoUrl?: string;
  net: number;
};

type PlayerHandHistoryItem = {
  handNumber: number;
  pot: number;
  winnerUid: string;
  winnerName: string;
  isWinner: boolean;
  playerContribution: number;
  playerNet: number;
  allResults: {
    uid: string;
    displayName: string;
    contribution: number;
    net: number;
    isWinner: boolean;
  }[];
};

function getPlayerSummaryStats({
  targetUid,
  settlements,
  players,
}: {
  targetUid: string;
  settlements: Record<string, HandSettlement>;
  players: RoomPlayerListItem[];
}) {
  const playerNamesByUid = new Map(players.map((p) => [p.uid, p.displayName]));
  const playerPhotosByUid = new Map(players.map((p) => [p.uid, p.photoUrl]));

  let totalNet = 0;
  let handsPlayed = 0;
  let handsWon = 0;

  const headToHeadMap = new Map<string, number>();

  const settlementList = Object.values(settlements).sort(
    (first, second) => second.handNumber - first.handNumber,
  );

  const handHistory: PlayerHandHistoryItem[] = [];

  settlementList.forEach((settlement) => {
    const winnerUids = getSettlementWinnerUids(settlement);
    const result = settlement.playerResults[targetUid];
    const isWinner = winnerUids.includes(targetUid);
    const contribution = result?.contribution ?? 0;
    const net = result?.net ?? (isWinner ? settlement.pot : 0);

    if (contribution > 0 || net !== 0 || isWinner) {
      handsPlayed += 1;

      if (isWinner) {
        handsWon += 1;
      }

      totalNet += net;

      // Head to Head calculation
      if (isWinner) {
        const winnerShareIndex = winnerUids.indexOf(targetUid);

        Object.values(settlement.playerResults).forEach((otherResult) => {
          if (
            !winnerUids.includes(otherResult.uid) &&
            otherResult.contribution > 0
          ) {
            const splitContribution = Math.floor(
              otherResult.contribution / winnerUids.length,
            );
            const remainder =
              otherResult.contribution -
              splitContribution * winnerUids.length;
            const extra = winnerShareIndex < remainder ? 1 : 0;
            const prev = headToHeadMap.get(otherResult.uid) ?? 0;
            headToHeadMap.set(
              otherResult.uid,
              prev + splitContribution + extra,
            );
          }
        });
      } else if (contribution > 0) {
        const splitContribution = Math.floor(contribution / winnerUids.length);
        let remaining = contribution - splitContribution * winnerUids.length;

        winnerUids.forEach((winnerUid) => {
          const extra = remaining > 0 ? 1 : 0;
          const prev = headToHeadMap.get(winnerUid) ?? 0;
          headToHeadMap.set(winnerUid, prev - splitContribution - extra);
          remaining -= extra;
        });
      }

      const allResults = Object.values(settlement.playerResults)
        .map((r) => ({
          uid: r.uid,
          displayName: playerNamesByUid.get(r.uid) ?? r.displayName ?? "Player",
          contribution: r.contribution,
          net: r.net,
          isWinner: winnerUids.includes(r.uid),
        }))
        .sort((a, b) => b.net - a.net);

      handHistory.push({
        handNumber: settlement.handNumber,
        pot: settlement.pot,
        winnerUid: settlement.winnerUid,
        winnerName: settlement.winnerName,
        isWinner,
        playerContribution: contribution,
        playerNet: net,
        allResults,
      });
    }
  });

  const headToHeadRows: HeadToHeadRow[] = Array.from(headToHeadMap.entries())
    .map(([uid, net]) => ({
      uid,
      displayName: playerNamesByUid.get(uid) ?? "Player",
      photoUrl: playerPhotosByUid.get(uid),
      net,
    }))
    .sort((a, b) => b.net - a.net);

  // Compute room rank
  const totalsByUid = new Map<string, number>();
  players.forEach((p) => totalsByUid.set(p.uid, 0));
  Object.values(settlements).forEach((s) => {
    Object.values(s.playerResults).forEach((r) => {
      totalsByUid.set(r.uid, (totalsByUid.get(r.uid) ?? 0) + r.net);
    });
  });

  const rankedUids = Array.from(totalsByUid.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([uid]) => uid);

  const rank = rankedUids.indexOf(targetUid) + 1;
  const streakStats = getPlayerWinStreakStats(targetUid, settlements);

  return {
    totalNet,
    handsPlayed,
    handsWon,
    winRate: handsPlayed > 0 ? Math.round((handsWon / handsPlayed) * 100) : 0,
    currentStreak: streakStats.currentStreak,
    maxStreak: streakStats.maxStreak,
    headToHeadRows,
    handHistory,
    rank: rank > 0 ? rank : null,
  };
}

export function PlayerSummaryDialog({
  open,
  onOpenChange,
  targetPlayer,
  settlements,
  players,
  currentUid,
  hostUid,
  onEditProfile,
  onKick,
  isKicking,
  onTransferHost,
  isTransferringHost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlayer: RoomPlayerListItem | null;
  settlements: Record<string, HandSettlement>;
  players: RoomPlayerListItem[];
  currentUid: string;
  hostUid: string;
  onEditProfile?: () => void;
  onKick?: () => Promise<void> | void;
  isKicking?: boolean;
  onTransferHost?: () => Promise<void> | void;
  isTransferringHost?: boolean;
}) {
  const [expandedHands, setExpandedHands] = useState<Set<number>>(new Set());
  const [confirmingKick, setConfirmingKick] = useState(false);
  const [confirmingTransferHost, setConfirmingTransferHost] = useState(false);

  if (!targetPlayer) {
    return null;
  }

  const isCurrentUser = targetPlayer.uid === currentUid;
  const isHost = targetPlayer.uid === hostUid;
  const currentUserIsHost = currentUid === hostUid;
  const canKick =
    Boolean(onKick) &&
    currentUserIsHost &&
    !isCurrentUser &&
    !isHost;
  const canTransferHost =
    Boolean(onTransferHost) && currentUserIsHost && !isCurrentUser && !isHost;

  const stats = getPlayerSummaryStats({
    targetUid: targetPlayer.uid,
    settlements,
    players,
  });

  function toggleHand(handNumber: number) {
    setExpandedHands((prev) => {
      const next = new Set(prev);
      if (next.has(handNumber)) {
        next.delete(handNumber);
      } else {
        next.add(handNumber);
      }
      return next;
    });
  }

  const isTop1 = stats.rank === 1 && stats.totalNet > 0;
  const isTop2 = stats.rank === 2;
  const isTop3 = stats.rank === 3;

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmingKick(false);
      setConfirmingTransferHost(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)] sm:max-w-md top-[10%] translate-y-0">
        <DialogHeader className="text-left">
          <DialogTitle className="sr-only">
            {targetPlayer.displayName}&apos;s Game Summary
          </DialogTitle>
          <DialogDescription className="sr-only">
            Statistics and performance overview for {targetPlayer.displayName}.
          </DialogDescription>
        </DialogHeader>

        {/* Player Profile Header */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.04)]">
          <div className="shrink-0">
            <PlayerAvatar
              uid={targetPlayer.uid}
              name={targetPlayer.displayName ?? "Player"}
              photoUrl={targetPlayer.photoUrl}
              winStreak={stats.currentStreak}
              isCurrentUser={isCurrentUser}
              isDealer={false}
              isCurrentTurn={false}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-white">
                {targetPlayer.displayName}
              </h3>
              {isCurrentUser ? (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                  You
                </span>
              ) : null}
              {isHost ? (
                <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  Host
                </span>
              ) : null}
              {stats.currentStreak >= 2 ? (
                <span className="flex animate-pulse items-center gap-1 rounded-full border border-orange-400/80 bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-[0_0_10px_rgba(249,115,22,0.9)]">
                  <span>🔥</span>
                  <span>{stats.currentStreak}-Streak!</span>
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span
                  className={`size-2 rounded-full ${targetPlayer.online !== false ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-neutral-500"}`}
                />
                <span className="text-white/60">
                  {targetPlayer.online !== false ? "Online" : "Offline"}
                </span>
              </span>

              {stats.rank ? (
                <>
                  <span className="text-white/30">•</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold whitespace-nowrap ${
                      isTop1
                        ? "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                        : isTop2
                          ? "text-slate-300"
                          : isTop3
                            ? "text-amber-500"
                            : "text-white/60"
                    }`}
                  >
                    {stats.rank === 1 ? (
                      <Crown className="size-3.5" />
                    ) : (
                      <Trophy className="size-3" />
                    )}
                    Rank #{stats.rank}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {isCurrentUser && onEditProfile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEditProfile();
              }}
              className="shrink-0 border-white/30 bg-white/10 text-xs text-white hover:bg-white/20 hover:text-white"
            >
              <UserPen className="size-3.5" />
              Edit
            </Button>
          ) : null}
        </div>

        {canTransferHost || canKick ? (
          <div className="space-y-2">
            {canTransferHost ? (
              confirmingTransferHost ? (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                      <Crown className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-amber-200">
                          Make {targetPlayer.displayName} the host?
                        </p>
                        <p className="text-xs text-white/60">
                          They will be able to start hands, settle winners,
                          arrange seats, kick players, and delete the room.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isTransferringHost}
                          onClick={() => setConfirmingTransferHost(false)}
                          className="flex-1 border-white/20 bg-white/5 text-xs text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isTransferringHost}
                          onClick={async () => {
                            try {
                              await onTransferHost?.();
                            } finally {
                              setConfirmingTransferHost(false);
                            }
                          }}
                          className="flex-1 border-amber-400/40 bg-amber-400/20 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 hover:text-amber-50"
                        >
                          {isTransferringHost ? (
                            <span className="animate-pulse">Changing...</span>
                          ) : (
                            <>
                              <Crown className="size-3.5" />
                              Confirm
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingTransferHost(true)}
                  className="flex h-auto w-full items-center justify-center gap-1.5 border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 shadow-[inset_0_0_12px_rgba(251,191,36,0.08)] hover:bg-amber-400/20 hover:text-amber-200"
                >
                  <Crown className="size-3.5" />
                  Make Host
                </Button>
              )
            ) : null}

            {canKick ? (
              confirmingKick ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-rose-200">
                        Kick {targetPlayer.displayName}?
                      </p>
                      <p className="text-xs text-white/60">
                        This will remove them from the room. If they were the
                        next big blind, the position will move to the next
                        player.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isKicking}
                        onClick={() => setConfirmingKick(false)}
                        className="flex-1 border-white/20 bg-white/5 text-xs text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isKicking}
                        onClick={async () => {
                          try {
                            await onKick?.();
                          } finally {
                            setConfirmingKick(false);
                          }
                        }}
                        className="flex-1 border-rose-500/40 bg-rose-500/20 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 hover:text-rose-100"
                      >
                        {isKicking ? (
                          <span className="animate-pulse">Kicking…</span>
                        ) : (
                          <>
                            <UserX className="size-3.5" />
                            Confirm Kick
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingKick(true)}
                  className="flex h-auto w-full items-center justify-center gap-1.5 border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 shadow-[inset_0_0_12px_rgba(244,63,94,0.08)] hover:bg-rose-500/20 hover:text-rose-200"
                >
                  <UserX className="size-3.5" />
                  Kick Player from Room
                </Button>
              )
            ) : null}
          </div>
        ) : null}

        {/* 4 Main Stat Cards */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5">
            <p className="text-[10px] font-medium text-white/50">Total P/L</p>
            <p
              className={`mt-1 truncate text-sm font-bold tabular-nums ${
                stats.totalNet > 0
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  : stats.totalNet < 0
                    ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    : "text-white/80"
              }`}
            >
              {formatAmount(stats.totalNet)}
            </p>
            <p className="text-[9px] text-white/40">THB</p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5">
            <p className="text-[10px] font-medium text-white/50">Hands</p>
            <p className="mt-1 text-sm font-bold text-white tabular-nums">
              {stats.handsPlayed}
            </p>
            <p className="text-[9px] text-white/40">Played</p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5">
            <p className="text-[10px] font-medium text-white/50">Win Rate</p>
            <p className="mt-1 text-sm font-bold text-white tabular-nums">
              {stats.winRate}%
            </p>
            <p className="text-[9px] text-white/40">
              {stats.handsWon} win{stats.handsWon === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5">
            <p className="text-[10px] font-medium text-white/50">Streak</p>
            <p
              className={`mt-1 text-sm font-bold tabular-nums ${
                stats.currentStreak >= 2
                  ? "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                  : "text-white"
              }`}
            >
              {stats.currentStreak >= 2
                ? `🔥 ${stats.currentStreak}x`
                : `${stats.currentStreak}x`}
            </p>
            <p className="text-[9px] text-white/40">Best {stats.maxStreak}x</p>
          </div>
        </div>

        {/* Head-to-Head vs Others */}
        {stats.headToHeadRows.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              <Users className="size-3.5" />
              <span>Score vs Players</span>
            </div>

            <div className="space-y-1.5">
              {stats.headToHeadRows.map((row) => (
                <div
                  key={row.uid}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2 pr-2">
                    {row.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={row.photoUrl}
                        alt=""
                        className="size-6 shrink-0 rounded-full border border-white/20 object-cover"
                      />
                    ) : (
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                        {row.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate font-semibold text-white">
                      {row.displayName}
                    </span>
                  </div>

                  <span
                    className={`shrink-0 font-bold tabular-nums ${
                      row.net > 0
                        ? "text-emerald-400"
                        : row.net < 0
                          ? "text-rose-400"
                          : "text-white/60"
                    }`}
                  >
                    {formatAmount(row.net)} THB
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Hand History Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <History className="size-3.5" />
            <span>Hand History ({stats.handHistory.length})</span>
          </div>

          {stats.handHistory.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/50">
              No hands played yet in this room.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.handHistory.map((item) => {
                const isExpanded = expandedHands.has(item.handNumber);

                return (
                  <div
                    key={item.handNumber}
                    className="overflow-hidden rounded-xl border border-white/15 bg-white/5 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHand(item.handNumber)}
                      className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                            item.isWinner
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {item.isWinner ? (
                            <TrendingUp className="size-3.5" />
                          ) : (
                            <TrendingDown className="size-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">
                            Hand #{item.handNumber}
                            {item.isWinner ? (
                              <span className="py-0.2 ml-1.5 rounded bg-emerald-500/20 px-1 text-[10px] font-semibold text-emerald-300">
                                Won Pot
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-white/50">
                            Pot {item.pot.toLocaleString("en-US")} THB
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            item.playerNet > 0
                              ? "text-emerald-400"
                              : item.playerNet < 0
                                ? "text-rose-400"
                                : "text-white/60"
                          }`}
                        >
                          {formatAmount(item.playerNet)} THB
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-white/40" />
                        ) : (
                          <ChevronDown className="size-4 text-white/40" />
                        )}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="space-y-1.5 border-t border-white/10 bg-black/40 p-3">
                        <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
                          Hand Breakdown
                        </p>
                        {item.allResults.map((r) => (
                          <div
                            key={r.uid}
                            className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                              r.uid === targetPlayer.uid
                                ? "bg-white/10 font-bold"
                                : "text-white/80"
                            }`}
                          >
                            <span className="truncate pr-2">
                              {r.displayName}
                              {r.isWinner ? (
                                <span className="ml-1 text-[10px] font-semibold text-emerald-400">
                                  (Winner)
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={`shrink-0 tabular-nums ${
                                r.net > 0
                                  ? "text-emerald-400"
                                  : r.net < 0
                                    ? "text-rose-400"
                                    : "text-white/50"
                              }`}
                            >
                              {formatAmount(r.net)} THB
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
