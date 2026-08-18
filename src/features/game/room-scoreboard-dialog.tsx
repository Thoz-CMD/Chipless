"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Trophy, UserPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getActiveWinStreaks } from "@/features/game/logic/win-streaks";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
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

type PersonalLedgerRow = {
  uid: string;
  displayName: string;
  net: number;
};

type PersonalHandHistoryRow = {
  handNumber: number;
  pot: number;
  winnerName: string;
  rows: PersonalLedgerRow[];
  net: number;
  settlement: HandSettlement;
};

type RoomLeaderboardRow = {
  rank: number;
  uid: string;
  displayName: string;
  photoUrl?: string;
  net: number;
  handsPlayed: number;
};

function getRoomLeaderboard({
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

function getPersonalRowsForSettlement({
  settlement,
  currentUid,
}: {
  settlement: HandSettlement;
  currentUid: string;
}): PersonalLedgerRow[] {
  const currentResult = settlement.playerResults[currentUid];

  if (!currentResult) {
    return [];
  }

  if (settlement.winnerUid === currentUid) {
    return Object.values(settlement.playerResults)
      .filter((result) => result.uid !== currentUid && result.contribution > 0)
      .map((result) => ({
        uid: result.uid,
        displayName: result.displayName,
        net: result.contribution,
      }));
  }

  if (currentResult.contribution <= 0) {
    return [];
  }

  return [
    {
      uid: settlement.winnerUid,
      displayName: settlement.winnerName,
      net: -currentResult.contribution,
    },
  ];
}

function getScoreRows({
  settlements,
  players,
  currentUid,
}: {
  settlements: Record<string, HandSettlement>;
  players: RoomPlayerListItem[];
  currentUid: string;
}): PersonalLedgerRow[] {
  const playerNamesByUid = new Map(players.map((p) => [p.uid, p.displayName]));
  const rows = new Map<string, PersonalLedgerRow>();

  Object.values(settlements).forEach((settlement) => {
    getPersonalRowsForSettlement({ settlement, currentUid }).forEach((row) => {
      const current = rows.get(row.uid);
      const latestDisplayName =
        playerNamesByUid.get(row.uid) ??
        current?.displayName ??
        row.displayName;

      rows.set(row.uid, {
        uid: row.uid,
        displayName: latestDisplayName,
        net: (current?.net ?? 0) + row.net,
      });
    });
  });

  return Array.from(rows.values()).sort(
    (first, second) => second.net - first.net,
  );
}

function getPersonalHistoryRows({
  settlementList,
  currentUid,
}: {
  settlementList: HandSettlement[];
  currentUid: string;
}): PersonalHandHistoryRow[] {
  return settlementList
    .map((settlement) => ({
      handNumber: settlement.handNumber,
      pot: settlement.pot,
      winnerName: settlement.winnerName,
      rows: getPersonalRowsForSettlement({ settlement, currentUid }),
      settlement,
    }))
    .map((settlement) => ({
      ...settlement,
      net: settlement.rows.reduce((total, row) => total + row.net, 0),
    }))
    .filter((settlement) => settlement.rows.length > 0);
}

export function RoomScoreboardDialog({
  open,
  onOpenChange,
  players,
  settlements,
  currentUid,
  onChangeName,
  onSelectPlayer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  currentUid: string;
  onChangeName?: () => void;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
}) {
  const [expandedHands, setExpandedHands] = useState<Set<number>>(new Set());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const settlementList = Object.values(settlements).sort(
    (first, second) => first.handNumber - second.handNumber,
  );
  const currentPlayerName =
    players.find((player) => player.uid === currentUid)?.displayName ?? "You";
  const leaderboardRows = getRoomLeaderboard({ settlements, players });
  const activeWinStreaks = getActiveWinStreaks(settlements);
  const rows = getScoreRows({ settlements, players, currentUid });
  const personalHistoryRows = getPersonalHistoryRows({
    settlementList,
    currentUid,
  });
  const playerNamesByUid = new Map(players.map((p) => [p.uid, p.displayName]));

  useEffect(() => {
    if (open) {
      setIsLeaderboardOpen(false);
    }
  }, [open]);

  function toggleExpandHand(handNumber: number) {
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

  const grandTotal = rows.reduce((total, row) => total + row.net, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)]">
        <DialogHeader>
          <DialogTitle>Game Summary</DialogTitle>
          <DialogDescription className="text-white/60">
            Current room standing and personal ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/10 p-3">
            <div>
              <p className="text-xs text-white/60">Your Total Net</p>
              <p className="text-xl font-bold">
                {formatAmount(grandTotal)} THB
              </p>
            </div>
            {onChangeName ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onChangeName();
                }}
                className="border-white/30 bg-white/10 text-xs text-white hover:bg-white/20 hover:text-white"
              >
                <UserPen className="size-3.5" />
                Change Name
              </Button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsLeaderboardOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <span className="text-xs font-bold tracking-wider text-white uppercase">
                Room Leaderboard ({leaderboardRows.length})
              </span>
            </div>
            {isLeaderboardOpen ? (
              <ChevronUp className="size-4 text-white/60" />
            ) : (
              <ChevronDown className="size-4 text-white/60" />
            )}
          </button>

          {isLeaderboardOpen ? (
            <div className="space-y-2">
              {leaderboardRows.length > 0 ? (
                leaderboardRows.map((row) => {
                  const isCurrentUser = row.uid === currentUid;
                  const isTop1 = row.rank === 1 && row.net > 0;
                  const isTop2 = row.rank === 2;
                  const isTop3 = row.rank === 3;
                  const targetPlayer = players.find((p) => p.uid === row.uid);

                  return (
                    <div
                      key={row.uid}
                      onClick={() => {
                        if (targetPlayer && onSelectPlayer) {
                          onOpenChange(false);
                          onSelectPlayer(targetPlayer);
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                        onSelectPlayer ? "cursor-pointer" : ""
                      } ${
                        isCurrentUser
                          ? "border-white/50 bg-white/10 shadow-[0_0_16px_rgba(255,255,255,0.12)] hover:bg-white/15"
                          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                      title={
                        onSelectPlayer
                          ? `Click to view ${row.displayName}'s summary`
                          : undefined
                      }
                    >
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isTop1
                              ? "border border-amber-400/50 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                              : isTop2
                                ? "border border-slate-300/40 bg-slate-300/20 text-slate-200"
                                : isTop3
                                  ? "border border-amber-700/50 bg-amber-700/20 text-amber-500"
                                  : "border border-white/20 bg-black/40 text-white/60"
                          }`}
                        >
                          {row.rank === 1 ? (
                            <Crown className="size-4 text-amber-300" />
                          ) : (
                            `#${row.rank}`
                          )}
                        </span>

                        {row.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={row.photoUrl}
                            alt=""
                            className="size-8 shrink-0 rounded-full border border-white/30 object-cover"
                          />
                        ) : null}

                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                            <span>{row.displayName}</span>
                            {activeWinStreaks[row.uid] &&
                            activeWinStreaks[row.uid] >= 2 ? (
                              <span
                                className="py-0.2 flex items-center gap-0.5 rounded-full border border-orange-400/80 bg-gradient-to-r from-amber-500 to-red-500 px-1.5 text-[9px] font-black text-white shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                                title={`${activeWinStreaks[row.uid]} hand win streak!`}
                              >
                                <span>🔥</span>
                                <span>{activeWinStreaks[row.uid]}</span>
                              </span>
                            ) : null}
                            {isCurrentUser ? (
                              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
                                You
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-white/45">
                            {row.handsPlayed} hand
                            {row.handsPlayed === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            row.net > 0
                              ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                              : row.net < 0
                                ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                : "text-white/70"
                          }`}
                        >
                          {formatAmount(row.net)} THB
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/50">
                  No scores recorded yet
                </div>
              )}
            </div>
          ) : null}
        </div>

        <section className="mt-2 space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your Balance</h3>
          {rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={row.uid}
                className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2"
              >
                <span className="font-semibold">{row.displayName}</span>
                <span
                  className={`font-bold ${
                    row.net > 0
                      ? "text-emerald-300"
                      : row.net < 0
                        ? "text-red-300"
                        : "text-white/60"
                  }`}
                >
                  {formatAmount(row.net)} THB
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-center text-sm text-white/55">
              No personal ledger yet.
            </p>
          )}
        </section>

        <section className="mt-2 space-y-2">
          <h3 className="text-sm font-semibold text-white/70">
            Your Hand History
          </h3>
          {personalHistoryRows.length > 0 ? (
            personalHistoryRows
              .slice()
              .reverse()
              .map((historyRow) => {
                const isExpanded = expandedHands.has(historyRow.handNumber);
                const allPlayerResults = Object.values(
                  historyRow.settlement.playerResults,
                ).sort((first, second) => second.net - first.net);

                return (
                  <div
                    key={historyRow.handNumber}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandHand(historyRow.handNumber)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          Hand #{historyRow.handNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white/65">
                            Pot {historyRow.pot.toLocaleString("en-US")} THB
                          </span>
                          {isExpanded ? (
                            <ChevronUp
                              className="size-4 text-white/60"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronDown
                              className="size-4 text-white/60"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-white/65">
                        <span>Winner: </span>
                        <span className="font-semibold text-white">
                          {historyRow.winnerName}
                        </span>
                        <span
                          className={`float-right font-semibold ${
                            historyRow.net > 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {formatAmount(historyRow.net)} THB
                        </span>
                      </p>
                    </button>

                    {isExpanded ? (
                      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                        <p className="text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                          Hand Breakdown
                        </p>
                        {allPlayerResults.map((result) => {
                          const latestName =
                            playerNamesByUid.get(result.uid) ??
                            result.displayName;
                          return (
                            <div
                              key={result.uid}
                              className="flex items-center justify-between py-0.5 text-xs"
                            >
                              <span className="text-white/80">
                                {latestName}
                                {result.uid ===
                                historyRow.settlement.winnerUid ? (
                                  <span className="ml-1 text-[10px] font-semibold text-amber-300">
                                    (Winner)
                                  </span>
                                ) : null}
                              </span>
                              <span
                                className={`font-semibold ${
                                  result.net > 0
                                    ? "text-emerald-300"
                                    : result.net < 0
                                      ? "text-red-300"
                                      : "text-white/50"
                                }`}
                              >
                                {formatAmount(result.net)} THB
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
          ) : (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-center text-sm text-white/55">
              No personal hand history yet.
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
