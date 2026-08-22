"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Crown, Trophy, UserPen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getActiveWinStreaks } from "@/features/game/logic/win-streaks";
import { getRoomLeaderboard } from "@/features/game/logic/room-leaderboard";
import {
  correctHandWinner,
  getSettlementWinnerUids,
  SettleHandError,
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

function splitAmount(amount: number, receiverUids: readonly string[]): number[] {
  const baseShare = Math.floor(amount / receiverUids.length);
  let remaining = amount - baseShare * receiverUids.length;

  return receiverUids.map(() => {
    const extra = remaining > 0 ? 1 : 0;
    remaining -= extra;
    return baseShare + extra;
  });
}

function sameUidSet(
  firstUids: readonly string[],
  secondUids: readonly string[],
): boolean {
  return (
    firstUids.length === secondUids.length &&
    firstUids.every((uid) => secondUids.includes(uid))
  );
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

  const winnerUids = getSettlementWinnerUids(settlement);
  const isCurrentUserWinner = winnerUids.includes(currentUid);

  if (isCurrentUserWinner) {
    return Object.values(settlement.playerResults)
      .filter(
        (result) => !winnerUids.includes(result.uid) && result.contribution > 0,
      )
      .map((result) => {
        const winnerShareIndex = winnerUids.indexOf(currentUid);
        const shares = splitAmount(result.contribution, winnerUids);

        return {
          uid: result.uid,
          displayName: result.displayName,
          net: shares[winnerShareIndex] ?? 0,
        };
      })
      .filter((row) => row.net !== 0);
  }

  if (currentResult.contribution <= 0) {
    return [];
  }

  const shares = splitAmount(currentResult.contribution, winnerUids);

  return winnerUids
    .map((winnerUid, index) => {
      const winnerResult = settlement.playerResults[winnerUid];

      return {
        uid: winnerUid,
        displayName: winnerResult?.displayName ?? "Winner",
        net: -(shares[index] ?? 0),
      };
    })
    .filter((row) => row.net !== 0);
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
  roomId,
  players,
  settlements,
  currentUid,
  canEditWinners = false,
  onChangeName,
  onSelectPlayer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  currentUid: string;
  canEditWinners?: boolean;
  onChangeName?: () => void;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
}) {
  const t = useTranslations("game_summary");
  const tCommon = useTranslations("common");
  const [expandedHands, setExpandedHands] = useState<Set<number>>(new Set());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [editingWinnerHandNumber, setEditingWinnerHandNumber] = useState<
    number | null
  >(null);
  const [editingWinnerUids, setEditingWinnerUids] = useState<Set<string>>(
    new Set(),
  );
  const [updatingWinnerKey, setUpdatingWinnerKey] = useState<string | null>(
    null,
  );

  const settlementList = Object.values(settlements).sort(
    (first, second) => first.handNumber - second.handNumber,
  );
  const latestSettlementHandNumber = settlementList.at(-1)?.handNumber;
  const leaderboardRows = getRoomLeaderboard({ settlements, players });
  const activeWinStreaks = getActiveWinStreaks(settlements);
  const rows = getScoreRows({ settlements, players, currentUid });
  const personalHistoryRows = getPersonalHistoryRows({
    settlementList,
    currentUid,
  });
  const playerNamesByUid = new Map(players.map((p) => [p.uid, p.displayName]));

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

  async function handleCorrectWinner({
    handNumber,
    winnerUids,
  }: {
    handNumber: number;
    winnerUids: string[];
  }): Promise<void> {
    const updateKey = `${handNumber}:${winnerUids.join("-")}`;

    if (handNumber !== latestSettlementHandNumber) {
      toast.error(t("only_latest_hand_edit"));
      setEditingWinnerHandNumber(null);
      setEditingWinnerUids(new Set());
      return;
    }

    if (updatingWinnerKey || winnerUids.length === 0) {
      return;
    }

    setUpdatingWinnerKey(updateKey);

    try {
      await correctHandWinner({ roomId, handNumber, winnerUids });
      toast.success(t("hand_winner_updated", { handNumber }));
      setEditingWinnerHandNumber(null);
      setEditingWinnerUids(new Set());
    } catch (error) {
      const message =
        error instanceof SettleHandError || error instanceof Error
          ? error.message
          : t("unable_to_edit_winner");
      toast.error(message);
    } finally {
      setUpdatingWinnerKey(null);
    }
  }

  const grandTotal = rows.reduce((total, row) => total + row.net, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/30 bg-white/10 p-3">
            <div>
              <p className="text-xs text-white/60">{t("your_total_net")}</p>
              <p className="text-xl font-bold">
                {formatAmount(grandTotal)} {tCommon("currency")}
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
                {t("change_name")}
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
                {t("room_leaderboard")} ({leaderboardRows.length})
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
                                {t("you")}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-white/45">
                            {row.handsPlayed} {row.handsPlayed === 1 ? t("hand") : t("hands")}
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
                          {formatAmount(row.net)} {tCommon("currency")}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/50">
                  {t("no_scores_recorded")}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <section className="mt-2 space-y-2">
          <h3 className="text-sm font-semibold text-white/70">{t("your_balance")}</h3>
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
                  {formatAmount(row.net)} {tCommon("currency")}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-center text-sm text-white/55">
              {t("no_personal_ledger")}
            </p>
          )}
        </section>

        <section className="mt-2 space-y-2">
          <h3 className="text-sm font-semibold text-white/70">
            {t("your_hand_history")}
          </h3>
          {personalHistoryRows.length > 0 ? (
            personalHistoryRows
              .slice()
              .reverse()
              .map((historyRow) => {
                const isExpanded = expandedHands.has(historyRow.handNumber);
                const canEditThisWinner =
                  canEditWinners &&
                  historyRow.handNumber === latestSettlementHandNumber;
                const winnerUids = getSettlementWinnerUids(
                  historyRow.settlement,
                );
                const selectedEditWinnerUids = Array.from(editingWinnerUids);
                const hasChangedEditedWinners = !sameUidSet(
                  winnerUids,
                  selectedEditWinnerUids,
                );
                const allPlayerResults = Object.values(
                  historyRow.settlement.playerResults,
                ).sort((first, second) => second.net - first.net);
                const foldedResultUids = new Set(
                  allPlayerResults
                    .filter((result) => result.hasFolded)
                    .map((result) => result.uid),
                );
                const hasInvalidEditedWinners = selectedEditWinnerUids.some(
                  (uid) => foldedResultUids.has(uid),
                );

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
                            {t("pot")} {historyRow.pot.toLocaleString("en-US")} {tCommon("currency")}
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
                        <span>{t("winner")} </span>
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
                          {formatAmount(historyRow.net)} {tCommon("currency")}
                        </span>
                      </p>
                    </button>

                    {isExpanded ? (
                      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                            {t("hand_breakdown")}
                          </p>
                          {canEditThisWinner ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingWinnerHandNumber(
                                  editingWinnerHandNumber ===
                                    historyRow.handNumber
                                    ? null
                                    : historyRow.handNumber,
                                );
                                setEditingWinnerUids(
                                  editingWinnerHandNumber ===
                                    historyRow.handNumber
                                    ? new Set()
                                    : new Set(winnerUids),
                                );
                              }}
                              className="h-7 border-white/25 bg-white/10 px-2 text-[11px] text-white hover:bg-white/20 hover:text-white"
                            >
                              {t("edit_winner")}
                            </Button>
                          ) : null}
                        </div>

                        {canEditThisWinner &&
                        editingWinnerHandNumber === historyRow.handNumber ? (
                          <div className="mb-2 rounded-lg border border-white/15 bg-black/45 p-2">
                            <p className="mb-2 text-[11px] font-semibold text-white/55">
                              {t("select_winners")}
                            </p>
                            <div className="grid gap-1.5">
                              {allPlayerResults.map((result) => {
                                const latestName =
                                  playerNamesByUid.get(result.uid) ??
                                  result.displayName;
                                const isSelectedWinner =
                                  editingWinnerUids.has(result.uid);
                                const isFolded = result.hasFolded === true;

                                return (
                                  <button
                                    key={result.uid}
                                    type="button"
                                    onClick={() => {
                                      if (isFolded) {
                                        return;
                                      }

                                      setEditingWinnerUids((current) => {
                                        const next = new Set(current);

                                        if (next.has(result.uid)) {
                                          next.delete(result.uid);
                                        } else {
                                          next.add(result.uid);
                                        }

                                        return next;
                                      });
                                    }}
                                    disabled={
                                      updatingWinnerKey !== null || isFolded
                                    }
                                    className={`flex h-9 items-center justify-between rounded-lg border px-2.5 text-left text-xs text-white transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                                      isFolded
                                        ? "border-red-300/20 bg-red-950/20"
                                        : isSelectedWinner
                                        ? "border-emerald-300/60 bg-emerald-300/15"
                                        : "border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10"
                                    }`}
                                  >
                                    <span className="font-semibold">
                                      {latestName}
                                    </span>
                                    <span className="text-white/55">
                                      {isFolded
                                        ? t("folded")
                                        : isSelectedWinner
                                          ? t("selected")
                                          : t("tap_to_add")}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                void handleCorrectWinner({
                                  handNumber: historyRow.handNumber,
                                  winnerUids: selectedEditWinnerUids,
                                });
                              }}
                              disabled={
                                selectedEditWinnerUids.length === 0 ||
                                hasInvalidEditedWinners ||
                                !hasChangedEditedWinners ||
                                updatingWinnerKey !== null
                              }
                              className="mt-2 h-9 w-full border-white bg-white text-xs font-bold text-black hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {updatingWinnerKey ? t("updating") : t("save_winners")}
                            </Button>
                          </div>
                        ) : null}

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
                                {winnerUids.includes(result.uid) ? (
                                  <span className="ml-1 text-[10px] font-semibold text-amber-300">
                                    ({t("winner").replace(":", "")})
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
                                {formatAmount(result.net)} {tCommon("currency")}
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
              {t("no_personal_history")}
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
