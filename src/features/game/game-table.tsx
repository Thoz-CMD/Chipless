"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";

import { CommunityCards } from "@/features/game/community-cards";
import type {
  BettingRound,
  HoldemActionLogEntry,
} from "@/features/game/logic/texas-holdem";
import { PlayerSeat } from "@/features/game/player-seat";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import {
  updatePlayerSeatOrder,
  UpdatePlayerSeatsError,
} from "@/features/rooms/services/update-player-seats";

function joinedAtValue(player: RoomPlayerListItem): number {
  return player.joinedAt ?? 0;
}

function getSeatPosition(index: number, playerCount: number): CSSProperties {
  if (index === 0 || playerCount <= 1) {
    return {
      left: "50%",
      top: "82%",
    };
  }

  const upperSeatCount = playerCount - 1;
  const angle =
    upperSeatCount === 1
      ? 270
      : 180 + ((index - 1) * 180) / (upperSeatCount - 1);
  const radians = (angle * Math.PI) / 180;
  const radiusX = 39;
  const radiusY = 35;
  const centerX = 50;
  const centerY = 50;

  return {
    left: `${centerX + radiusX * Math.cos(radians)}%`,
    top: `${centerY + radiusY * Math.sin(radians)}%`,
  };
}

function orderPlayersForSeats(
  players: RoomPlayerListItem[],
  currentUid: string,
): RoomPlayerListItem[] {
  const orderedPlayers = [...players].sort((first, second) => {
    const firstSeat = first.seatIndex;
    const secondSeat = second.seatIndex;

    if (typeof firstSeat === "number" && typeof secondSeat === "number") {
      return firstSeat - secondSeat;
    }

    if (typeof firstSeat === "number") {
      return -1;
    }

    if (typeof secondSeat === "number") {
      return 1;
    }

    return joinedAtValue(first) - joinedAtValue(second);
  });

  const currentPlayerIndex = orderedPlayers.findIndex(
    (player) => player.uid === currentUid,
  );

  if (currentPlayerIndex <= 0) {
    return orderedPlayers;
  }

  return [
    ...orderedPlayers.slice(currentPlayerIndex),
    ...orderedPlayers.slice(0, currentPlayerIndex),
  ];
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

function formatAction(entry: HoldemActionLogEntry): string {
  return entry.amount === undefined
    ? entry.action
    : `${entry.action} ${formatAmount(entry.amount)}`;
}

function getRevealStatus(bettingRound?: BettingRound): string | null {
  if (bettingRound === "flop") {
    return "Reveal Flop cards";
  }

  if (bettingRound === "turn") {
    return "Reveal Turn card";
  }

  if (bettingRound === "river") {
    return "Reveal River card";
  }

  if (bettingRound === "showdown") {
    return "Reveal showdown cards";
  }

  return null;
}

export function GameTable({
  roomId,
  players,
  currentUid,
  hostUid,
  canArrangeSeats,
  potAmount,
  currentPlayerContribution,
  currentBigBlindUid,
  currentTurnUid,
  foldedUids,
  actionLog,
  bettingRound,
  latestWinnerName,
  winStreaksByUid,
  onSelectPlayer,
}: {
  roomId: string;
  players: RoomPlayerListItem[];
  currentUid: string;
  hostUid: string;
  canArrangeSeats: boolean;
  potAmount: number;
  currentPlayerContribution?: number;
  currentBigBlindUid?: string;
  currentTurnUid?: string;
  foldedUids?: Set<string>;
  actionLog?: HoldemActionLogEntry[];
  bettingRound?: BettingRound;
  latestWinnerName?: string;
  winStreaksByUid?: Record<string, number>;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
}) {
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [dragTargetUid, setDragTargetUid] = useState<string | null>(null);
  const seatedPlayers = orderPlayersForSeats(players, currentUid);
  const playerUids = new Set(players.map((player) => player.uid));
  const bigBlindUid =
    currentBigBlindUid && playerUids.has(currentBigBlindUid)
      ? currentBigBlindUid
      : playerUids.has(hostUid)
        ? hostUid
        : players[0]?.uid;
  const hasActionInCurrentRound =
    bettingRound !== undefined &&
    actionLog?.some((entry) => entry.bettingRound === bettingRound);
  const revealStatus = hasActionInCurrentRound
    ? null
    : getRevealStatus(bettingRound);

  async function swapSeats(targetUid: string) {
    if (!draggingUid || draggingUid === targetUid) {
      setDraggingUid(null);
      setDragTargetUid(null);
      return;
    }

    const fromIndex = seatedPlayers.findIndex(
      (player) => player.uid === draggingUid,
    );
    const toIndex = seatedPlayers.findIndex(
      (player) => player.uid === targetUid,
    );

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingUid(null);
      setDragTargetUid(null);
      return;
    }

    const nextPlayers = [...seatedPlayers];
    const [movedPlayer] = nextPlayers.splice(fromIndex, 1);
    nextPlayers.splice(toIndex, 0, movedPlayer);

    try {
      await updatePlayerSeatOrder(
        roomId,
        nextPlayers.map((player) => player.uid),
      );
    } catch (error) {
      const message =
        error instanceof UpdatePlayerSeatsError || error instanceof Error
          ? error.message
          : "Unable to change seats.";
      toast.error(message);
    } finally {
      setDraggingUid(null);
      setDragTargetUid(null);
    }
  }

  return (
    <section className="relative mx-auto aspect-[4/5] w-full max-w-[430px]">
      <div className="absolute top-1/2 left-1/2 h-[76%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.92)_62%)] shadow-[inset_0_0_42px_rgba(255,255,255,0.08),0_0_28px_rgba(255,255,255,0.08)]" />
      <div className="absolute top-1/2 left-1/2 h-[64%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/35" />

      <div className="absolute top-[48%] left-1/2 w-[74%] -translate-x-1/2 -translate-y-1/2 space-y-3 text-center">
        <div className="mx-auto w-fit rounded-full border border-white/20 bg-black/60 px-5 py-2 text-white">
          <span className="text-sm text-white/45">Pot</span>{" "}
          <span className="text-xl font-semibold">
            {potAmount.toLocaleString("en-US")}
          </span>
          {currentPlayerContribution !== undefined ? (
            <>
              <span className="mx-1 text-white/35">:</span>
              <span className="text-sm text-white/45">You</span>{" "}
              <span className="text-xl font-semibold">
                {currentPlayerContribution.toLocaleString("en-US")}
              </span>{" "}
            </>
          ) : null}
        </div>
        {latestWinnerName || (actionLog && actionLog.length > 0) ? (
          <div className="mx-auto flex min-h-20 w-full max-w-[260px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3 py-2 shadow-[inset_0_0_18px_rgba(255,255,255,0.05)]">
            {latestWinnerName ? (
              <div className="mb-0.5 w-full rounded-lg border border-yellow-300/45 bg-yellow-300/15 px-3 py-1.5 text-sm font-bold text-yellow-200">
                Winner: {latestWinnerName}
              </div>
            ) : null}
            {revealStatus ? (
              <div className="mb-0.5 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                {revealStatus}
              </div>
            ) : null}
            {(actionLog ?? [])
              .slice(-3)
              .reverse()
              .map((entry, index) => {
                const isLatest = index === 0;

                return (
                  <div
                    key={entry.id}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 transition-all ${
                      isLatest
                        ? "border-white/35 bg-white/15 py-1.5 text-sm font-bold text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                        : "border-white/10 bg-white/5 py-1 text-xs text-white/60 opacity-60"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {isLatest ? (
                        <span
                          className="size-1.5 shrink-0 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.9)]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="truncate font-semibold text-white">
                        {entry.displayName}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 ${
                        isLatest ? "font-bold text-white" : "text-white/60"
                      }`}
                    >
                      {formatAction(entry)}
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <>
            <CommunityCards />
            <div className="space-y-1 text-xs text-white/35">
              <p className="font-audiowide text-white/45">Chipless</p>
            </div>
          </>
        )}
      </div>

      {seatedPlayers.map((player, index) => (
        <PlayerSeat
          key={player.uid}
          player={player}
          isCurrentUser={player.uid === currentUid}
          isBigBlind={player.uid === bigBlindUid}
          isCurrentTurn={player.uid === currentTurnUid}
          hasFolded={foldedUids?.has(player.uid)}
          winStreak={winStreaksByUid?.[player.uid]}
          style={getSeatPosition(index, seatedPlayers.length)}
          draggable={canArrangeSeats}
          isSelected={draggingUid === player.uid}
          isDragTarget={
            dragTargetUid === player.uid && draggingUid !== player.uid
          }
          onClick={() => {
            if (draggingUid) {
              void swapSeats(player.uid);
              return;
            }

            onSelectPlayer?.(player);
          }}
          onDragStart={() => {
            if (canArrangeSeats) {
              setDraggingUid(player.uid);
            }
          }}
          onDragOver={() => {
            if (canArrangeSeats) {
              setDragTargetUid(player.uid);
            }
          }}
          onDrop={() => {
            if (canArrangeSeats) {
              void swapSeats(player.uid);
            }
          }}
          onDragEnd={() => {
            setDraggingUid(null);
            setDragTargetUid(null);
          }}
        />
      ))}
    </section>
  );
}
