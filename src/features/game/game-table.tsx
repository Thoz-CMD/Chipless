"use client";

import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { CommunityCards } from "@/features/game/community-cards";
import type {
  BettingRound,
  HoldemActionLogEntry,
} from "@/features/game/logic/texas-holdem";
import type { ExtinguishedWinStreak } from "@/features/game/logic/win-streaks";
import { PlayerSeat } from "@/features/game/player-seat";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import {
  updatePlayerSeatOrder,
  UpdatePlayerSeatsError,
} from "@/features/rooms/services/update-player-seats";
import { TABLE_THEMES, DEFAULT_TABLE_ID } from "@/features/game/table-skins";
import type { TableTheme, CardTheme } from "@/features/game/table-skins";

function joinedAtValue(player: RoomPlayerListItem): number {
  return player.joinedAt ?? 0;
}

type SeatCoordinates = {
  x: number;
  y: number;
};

function getSeatCoordinates(index: number, total: number): SeatCoordinates {
  if (total <= 0) {
    return { x: 50, y: 50 };
  }

  const angle = (index / total) * 2 * Math.PI + Math.PI / 2;
  const radiusX = 40;
  const radiusY = 36;

  return {
    x: 50 + radiusX * Math.cos(angle),
    y: 47 + radiusY * Math.sin(angle),
  };
}

function getSeatPosition(coordinates: SeatCoordinates): CSSProperties {
  return {
    left: `${coordinates.x}%`,
    top: `${coordinates.y}%`,
  };
}

function orderPlayersForSeats(
  players: RoomPlayerListItem[],
  currentUid?: string,
): RoomPlayerListItem[] {
  const sorted = [...players].sort((first, second) => {
    const firstSeat = first.seatIndex ?? Number.MAX_SAFE_INTEGER;
    const secondSeat = second.seatIndex ?? Number.MAX_SAFE_INTEGER;

    if (firstSeat !== secondSeat) {
      return firstSeat - secondSeat;
    }

    return joinedAtValue(first) - joinedAtValue(second);
  });

  if (!currentUid) {
    return sorted;
  }

  const currentIndex = sorted.findIndex((player) => player.uid === currentUid);

  if (currentIndex <= 0) {
    return sorted;
  }

  return [
    ...sorted.slice(currentIndex),
    ...sorted.slice(0, currentIndex),
  ];
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

function getRevealStatus(
  bettingRound: BettingRound | undefined,
  t: (key: string) => string,
): string | null {
  if (bettingRound === "flop") {
    return t("reveal_flop");
  }

  if (bettingRound === "turn") {
    return t("reveal_turn");
  }

  if (bettingRound === "river") {
    return t("reveal_river");
  }

  if (bettingRound === "showdown") {
    return t("reveal_showdown");
  }

  return null;
}

export function GameTable({
  players,
  currentUid,
  hostUid,
  currentBigBlindUid,
  currentSmallBlindUid,
  currentTurnUid,
  potAmount,
  currentPlayerContribution,
  bettingRound,
  actionLog,
  foldedUids,
  smallBlindAmount,
  bigBlindAmount,
  latestWinnerName,
  canArrangeSeats = false,
  roomId,
  activeHandPlayerUids,
  winStreaksByUid,
  extinguishAnimation,
  winnerAmountsByUid,
  onSelectPlayer,
  tableTheme,
  cardTheme,
}: {
  players: RoomPlayerListItem[];
  currentUid?: string;
  hostUid?: string;
  currentBigBlindUid?: string;
  currentSmallBlindUid?: string;
  currentTurnUid?: string;
  potAmount: number;
  currentPlayerContribution?: number;
  bettingRound?: BettingRound;
  actionLog?: HoldemActionLogEntry[];
  foldedUids?: Set<string>;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  latestWinnerName?: string | null;
  canArrangeSeats?: boolean;
  roomId: string;
  activeHandPlayerUids?: Set<string>;
  winStreaksByUid?: Record<string, number>;
  extinguishAnimation?: ExtinguishedWinStreak | null;
  winnerAmountsByUid?: Record<string, number>;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
  tableTheme?: TableTheme;
  cardTheme?: CardTheme;
}) {
  const activeTableTheme: TableTheme = tableTheme ?? TABLE_THEMES[DEFAULT_TABLE_ID];
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [dragTargetUid, setDragTargetUid] = useState<string | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef<boolean>(false);
  const activeTouchUidRef = useRef<string | null>(null);

  const t = useTranslations("game");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const seatedPlayers = orderPlayersForSeats(players, currentUid);
  const seatCoordinatesByUid = new Map(
    seatedPlayers.map((player, index) => [
      player.uid,
      getSeatCoordinates(index, seatedPlayers.length),
    ]),
  );
  const playerUids = new Set(players.map((player) => player.uid));
  const bigBlindUid =
    currentBigBlindUid && playerUids.has(currentBigBlindUid)
      ? currentBigBlindUid
      : playerUids.has(hostUid ?? "")
        ? hostUid
        : players[0]?.uid;
  
  const dealerUid = currentSmallBlindUid 
    ? (() => {
        const sbIndex = seatedPlayers.findIndex(p => p.uid === currentSmallBlindUid);
        if (sbIndex === -1) return undefined;
        const dealerIndex = sbIndex === 0 ? seatedPlayers.length - 1 : sbIndex - 1;
        return seatedPlayers[dealerIndex]?.uid;
      })()
    : undefined;
  
  const hasActionInCurrentRound =
    bettingRound !== undefined &&
    actionLog?.some((entry) => entry.bettingRound === bettingRound);
  const revealStatus = hasActionInCurrentRound
    ? null
    : getRevealStatus(bettingRound, t);

  const lastActionByUid = new Map<string, string>();
  const lastActionAmountByUid = new Map<string, string>();
  
  if (actionLog && bettingRound) {
    const currentRoundActions = actionLog.filter(
      (entry) => entry.bettingRound === bettingRound
    );
    
    currentRoundActions.forEach((entry) => {
      const actionKey = entry.action.toLowerCase().replace(/\s+/g, "_");
      const translatedAction = tActions(actionKey);
      
      lastActionByUid.set(entry.uid, translatedAction);
      
      if (entry.amount !== undefined) {
        lastActionAmountByUid.set(
          entry.uid,
          `${formatAmount(entry.amount)} ${tCommon("currency")}`
        );
      }
    });
  }

  if (bettingRound === "preflop" && smallBlindAmount && bigBlindAmount) {
    if (currentSmallBlindUid && !lastActionByUid.has(currentSmallBlindUid)) {
      lastActionByUid.set(currentSmallBlindUid, tActions("small_blind"));
      lastActionAmountByUid.set(
        currentSmallBlindUid,
        `${formatAmount(smallBlindAmount)} ${tCommon("currency")}`
      );
    }
    
    if (bigBlindUid && !lastActionByUid.has(bigBlindUid)) {
      lastActionByUid.set(bigBlindUid, tActions("big_blind"));
      lastActionAmountByUid.set(
        bigBlindUid,
        `${formatAmount(bigBlindAmount)} ${tCommon("currency")}`
      );
    }
  }
  
  if (foldedUids) {
    foldedUids.forEach((uid) => {
      if (!lastActionByUid.has(uid)) {
        lastActionByUid.set(uid, tActions("fold"));
      }
    });
  }

  async function swapSeats(targetUid: string) {
    const fromUid = draggingUid || activeTouchUidRef.current;
    if (!canArrangeSeats || !fromUid || fromUid === targetUid) {
      setDraggingUid(null);
      setDragTargetUid(null);
      activeTouchUidRef.current = null;
      return;
    }

    const fromIndex = seatedPlayers.findIndex(
      (player) => player.uid === fromUid,
    );
    const toIndex = seatedPlayers.findIndex(
      (player) => player.uid === targetUid,
    );

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingUid(null);
      setDragTargetUid(null);
      activeTouchUidRef.current = null;
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
      activeTouchUidRef.current = null;
    }
  }

  const handleTouchStart = (playerUid: string, e: React.TouchEvent) => {
    if (!canArrangeSeats) return;
    const touch = e.touches[0];
    if (!touch) return;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    activeTouchUidRef.current = playerUid;
    isTouchDraggingRef.current = false;

    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }

    touchTimerRef.current = setTimeout(() => {
      isTouchDraggingRef.current = true;
      setDraggingUid(playerUid);
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch {
        // ignore
      }
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canArrangeSeats) return;
    const touch = e.touches[0];
    if (!touch) return;

    if (!isTouchDraggingRef.current) {
      if (touchStartPosRef.current) {
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
          }
        }
      }
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSeat = el?.closest("[data-player-uid]");
    const targetUid = targetSeat?.getAttribute("data-player-uid");

    if (targetUid && targetUid !== activeTouchUidRef.current) {
      setDragTargetUid(targetUid);
    } else {
      setDragTargetUid(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false;
      const touch = e.changedTouches[0];
      if (touch) {
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetSeat = el?.closest("[data-player-uid]");
        const targetUid = targetSeat?.getAttribute("data-player-uid");
        if (targetUid && targetUid !== activeTouchUidRef.current) {
          void swapSeats(targetUid);
          return;
        }
      }
    }
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    isTouchDraggingRef.current = false;
    activeTouchUidRef.current = null;
    setDraggingUid(null);
    setDragTargetUid(null);
  };

  return (
    <section className="relative mx-auto h-full w-full">
      {canArrangeSeats && draggingUid && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-400/50 bg-black/90 px-3 py-1 text-xs text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.3)] animate-pulse">
          <span>แตะหรือลากไปวางที่ตำแหน่งที่ต้องการย้าย</span>
          <button
            type="button"
            onClick={() => {
              setDraggingUid(null);
              setDragTargetUid(null);
              activeTouchUidRef.current = null;
            }}
            className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className="absolute top-[47%] left-1/2 h-[70%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500"
        style={{
          background: activeTableTheme.tableOuter,
          borderColor: activeTableTheme.tableBorder,
          boxShadow: activeTableTheme.tableGlow,
        }}
      />
      <div
        className="absolute top-[47%] left-1/2 h-[58%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500"
        style={{
          background: activeTableTheme.tableInner,
          borderColor: activeTableTheme.tableBorder,
        }}
      />

      <div className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        {latestWinnerName ? (
          <div className="animate-in fade-in zoom-in duration-500 px-5 py-2">
            <span className="text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              ผู้ชนะ: {latestWinnerName}
            </span>
          </div>
        ) : null}
        
        {revealStatus ? (
          <div className="animate-in fade-in zoom-in duration-500 px-5 py-2">
            <span className="text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              {revealStatus}
            </span>
          </div>
        ) : null}
        
        <div
          className="flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-500"
          style={{ background: activeTableTheme.potBg }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-white/70">พอท</span>
            <span className="text-white font-bold text-base">{potAmount.toLocaleString()}</span>
          </div>
          {currentPlayerContribution !== undefined ? (
            <>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/70">คุณ</span>
                <span className="text-white font-bold text-base">{currentPlayerContribution.toLocaleString()}</span>
              </div>
            </>
          ) : null}
        </div>
        
        <CommunityCards bettingRound={bettingRound} cardTheme={cardTheme} />
        
        <div className="font-audiowide text-white text-xs font-bold tracking-wider opacity-80">
          CHIPLESS
        </div>
      </div>

      {seatedPlayers.map((player, index) => (
        <PlayerSeat
          key={player.uid}
          player={player}
          isCurrentUser={player.uid === currentUid}
          isDealer={player.uid === dealerUid}
          isCurrentTurn={player.uid === currentTurnUid}
          hasFolded={foldedUids?.has(player.uid)}
          isWaitingForNextHand={
            activeHandPlayerUids !== undefined &&
            !activeHandPlayerUids.has(player.uid) &&
            actionLog !== undefined && actionLog.length > 0
          }
          winStreak={winStreaksByUid?.[player.uid]}
          isExtinguishing={extinguishAnimation?.extinguishedUids.includes(
            player.uid,
          )}
          winnerAmount={winnerAmountsByUid?.[player.uid]}
          lastAction={lastActionByUid.get(player.uid)}
          lastActionAmount={lastActionAmountByUid.get(player.uid)}
          style={getSeatPosition(
            seatCoordinatesByUid.get(player.uid) ??
              getSeatCoordinates(index, seatedPlayers.length),
          )}
          seatCoordinates={seatCoordinatesByUid.get(player.uid) ??
              getSeatCoordinates(index, seatedPlayers.length)}
          draggable={canArrangeSeats}
          isSelected={draggingUid === player.uid}
          isDragTarget={
            dragTargetUid === player.uid && draggingUid !== player.uid
          }
          onClick={() => {
            if (draggingUid) {
              if (draggingUid === player.uid) {
                setDraggingUid(null);
                setDragTargetUid(null);
                activeTouchUidRef.current = null;
              } else {
                void swapSeats(player.uid);
              }
              return;
            }

            if (canArrangeSeats) {
              setDraggingUid(player.uid);
              return;
            }

            onSelectPlayer?.(player);
          }}
          onTouchStart={(e) => handleTouchStart(player.uid, e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
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
