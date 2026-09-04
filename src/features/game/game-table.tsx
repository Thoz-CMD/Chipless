"use client";

import { useState } from "react";
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

function getSeatCoordinates(
  index: number,
  playerCount: number,
): SeatCoordinates {
  if (index === 0 || playerCount <= 1) {
    return {
      x: 50,
      y: 81,
    };
  }

  const upperSeatCount = playerCount - 1;
  const angle =
    upperSeatCount === 1
      ? 270
      : 180 + ((index - 1) * 180) / (upperSeatCount - 1);
  const radians = (angle * Math.PI) / 180;
  const radiusX = 37;
  const radiusY = 32;
  const centerX = 50;
  const centerY = 47;

  return {
    x: centerX + radiusX * Math.cos(radians),
    y: centerY + radiusY * Math.sin(radians),
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

function formatAction(entry: HoldemActionLogEntry, t: (key: string) => string): string {
  const actionKey = entry.action.toLowerCase();
  const translatedAction = t(actionKey);
  
  return entry.amount === undefined
    ? translatedAction
    : `${translatedAction} ${formatAmount(entry.amount)}`;
}

function getRevealStatus(bettingRound: BettingRound | undefined, t: (key: string) => string): string | null {
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
  roomId,
  players,
  currentUid,
  hostUid,
  canArrangeSeats,
  potAmount,
  currentPlayerContribution,
  currentSmallBlindUid,
  currentBigBlindUid,
  smallBlindAmount,
  bigBlindAmount,
  currentTurnUid,
  activeHandPlayerUids,
  foldedUids,
  actionLog,
  bettingRound,
  latestWinnerName,
  winStreaksByUid,
  extinguishAnimation,
  winnerAmountsByUid,
  onSelectPlayer,
  tableTheme,
  cardTheme,
}: {
  roomId: string;
  players: RoomPlayerListItem[];
  currentUid: string;
  hostUid: string;
  canArrangeSeats: boolean;
  potAmount: number;
  currentPlayerContribution?: number;
  currentSmallBlindUid?: string;
  currentBigBlindUid?: string;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  currentTurnUid?: string;
  activeHandPlayerUids?: ReadonlySet<string>;
  foldedUids?: Set<string>;
  actionLog?: HoldemActionLogEntry[];
  bettingRound?: BettingRound;
  latestWinnerName?: string;
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
      : playerUids.has(hostUid)
        ? hostUid
        : players[0]?.uid;
  
  // Calculate Dealer position (one position before Small Blind)
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

  // Get last action for each player in current betting round
  const lastActionByUid = new Map<string, string>();
  const lastActionAmountByUid = new Map<string, string>();
  
  if (actionLog && bettingRound) {
    // Filter actions from current betting round only
    const currentRoundActions = actionLog.filter(
      (entry) => entry.bettingRound === bettingRound
    );
    
    // Get the most recent action for each player
    currentRoundActions.forEach((entry) => {
      const actionKey = entry.action.toLowerCase();
      const translatedAction = tActions(actionKey);
      
      lastActionByUid.set(entry.uid, translatedAction);
      
      // Store amount separately if available
      if (entry.amount !== undefined) {
        lastActionAmountByUid.set(
          entry.uid,
          `${formatAmount(entry.amount)} ${tCommon("currency")}`
        );
      }
    });
  }

  // Show BB/SB badges at round start (preflop with no actions yet)
  if (bettingRound === "preflop" && smallBlindAmount && bigBlindAmount) {
    // Add SB badge if player has no action yet
    if (currentSmallBlindUid && !lastActionByUid.has(currentSmallBlindUid)) {
      lastActionByUid.set(currentSmallBlindUid, tActions("small_blind"));
      lastActionAmountByUid.set(
        currentSmallBlindUid,
        `${formatAmount(smallBlindAmount)} ${tCommon("currency")}`
      );
    }
    
    // Add BB badge if player has no action yet
    if (bigBlindUid && !lastActionByUid.has(bigBlindUid)) {
      lastActionByUid.set(bigBlindUid, tActions("big_blind"));
      lastActionAmountByUid.set(
        bigBlindUid,
        `${formatAmount(bigBlindAmount)} ${tCommon("currency")}`
      );
    }
  }
  
  // Force show "Fold" for folded players even if action is not in current round
  if (foldedUids) {
    foldedUids.forEach((uid) => {
      if (!lastActionByUid.has(uid)) {
        lastActionByUid.set(uid, tActions("fold"));
      }
    });
  }

  async function swapSeats(targetUid: string) {
    if (!canArrangeSeats || !draggingUid || draggingUid === targetUid) {
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
    <section className="relative mx-auto h-full w-full">
      {/* Outer table felt */}
      <div
        className="absolute top-[47%] left-1/2 h-[70%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500"
        style={{
          background: activeTableTheme.tableOuter,
          borderColor: activeTableTheme.tableBorder,
          boxShadow: activeTableTheme.tableGlow,
        }}
      />
      {/* Inner table ring */}
      <div
        className="absolute top-[47%] left-1/2 h-[58%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500"
        style={{
          background: activeTableTheme.tableInner,
          borderColor: activeTableTheme.tableBorder,
        }}
      />

      {/* Center table display - Logo and Community Cards */}
      <div className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        {/* Winner Announcement */}
        {latestWinnerName ? (
          <div className="animate-in fade-in zoom-in duration-500 px-5 py-2">
            <span className="text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              ผู้ชนะ: {latestWinnerName}
            </span>
          </div>
        ) : null}
        
        {/* Reveal Status (Flop, Turn, River, Showdown) */}
        {revealStatus ? (
          <div className="animate-in fade-in zoom-in duration-500 px-5 py-2">
            <span className="text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              {revealStatus}
            </span>
          </div>
        ) : null}
        
        {/* Pot and Player Contribution Display */}
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
        
        {/* Community Cards */}
        <CommunityCards bettingRound={bettingRound} cardTheme={cardTheme} />
        
        {/* Chipless Logo */}
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
            // Only show waiting if hand has actually started (has actions)
            actionLog && actionLog.length > 0
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
