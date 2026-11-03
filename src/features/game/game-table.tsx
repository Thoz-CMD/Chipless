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
import { evaluateBestHand } from "@/features/game/logic/hand-evaluator";
import type { HandCategory } from "@/features/game/logic/hand-evaluator";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { TipNotification } from "@/features/game/tip-notification";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
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

function getRevealedHandCategory(
  bettingRound: BettingRound | undefined,
  privateCards: readonly string[] | undefined,
  communityCards: readonly string[] | undefined,
): HandCategory | undefined {
  if (
    bettingRound !== "summary" ||
    !privateCards ||
    !communityCards ||
    privateCards.length < 2 ||
    communityCards.length < 5
  ) {
    return undefined;
  }

  try {
    return evaluateBestHand([...privateCards.slice(0, 2), ...communityCards.slice(0, 5)]).category;
  } catch {
    return undefined;
  }
}

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

  return [...sorted.slice(currentIndex), ...sorted.slice(0, currentIndex)];
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
  communityCards,
  actionLog,
  foldedUids,
  smallBlindAmount,
  bigBlindAmount,
  latestWinnerName,
  canArrangeSeats = false,
  isArrangingSeats = false,
  onExitRearrangeSeats,
  roomId,
  activeHandPlayerUids,
  winStreaksByUid,
  extinguishAnimation,
  winnerAmountsByUid,
  onSelectPlayer,
  tableTheme,
  cardTheme,
  tipNotifications = [],
  onTipNotificationComplete,
  settlements,
  showdownCards,
  highlightedCards,
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
  communityCards?: readonly string[];
  actionLog?: HoldemActionLogEntry[];
  foldedUids?: Set<string>;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  latestWinnerName?: string | null;
  canArrangeSeats?: boolean;
  isArrangingSeats?: boolean;
  onExitRearrangeSeats?: () => void;
  roomId: string;
  activeHandPlayerUids?: Set<string>;
  winStreaksByUid?: Record<string, number>;
  extinguishAnimation?: ExtinguishedWinStreak | null;
  winnerAmountsByUid?: Record<string, number>;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
  tableTheme?: TableTheme;
  cardTheme?: CardTheme;
  tipNotifications?: TipNotification[];
  onTipNotificationComplete?: (id: string) => void;
  settlements?: Record<string, HandSettlement>;
  showdownCards?: Record<string, readonly string[]>;
  highlightedCards?: readonly string[];
}) {
  const activeTableTheme: TableTheme =
    tableTheme ?? TABLE_THEMES[DEFAULT_TABLE_ID];
  const [selectedSeatUid, setSelectedSeatUid] = useState<string | null>(null);

  const t = useTranslations("game");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("room_settings");
  const seatedPlayers = orderPlayersForSeats(players, currentUid);
  const seatCoordinatesByUid = new Map(
    seatedPlayers.map((player, index) => [
      player.uid,
      getSeatCoordinates(index, seatedPlayers.length),
    ]),
  );

  // Calculate player ranks based on total net from settlements
  const playerRanksByUid = new Map<string, number>();
  if (settlements) {
    const totalsByUid = new Map<string, number>();

    // Initialize all players with 0
    players.forEach((p) => totalsByUid.set(p.uid, 0));

    // Sum up all settlements
    Object.values(settlements).forEach((settlement) => {
      Object.values(settlement.playerResults).forEach((result) => {
        const currentTotal = totalsByUid.get(result.uid) ?? 0;
        totalsByUid.set(result.uid, currentTotal + (result.net || 0));
      });
    });

    // Sort by total and assign ranks
    const rankedUids = Array.from(totalsByUid.entries())
      .sort((a, b) => b[1] - a[1]) // Sort descending by total
      .map(([uid]) => uid);

    rankedUids.forEach((uid, index) => {
      playerRanksByUid.set(uid, index + 1); // Rank starts from 1
    });
  }

  const playerUids = new Set(players.map((player) => player.uid));
  const bigBlindUid =
    currentBigBlindUid && playerUids.has(currentBigBlindUid)
      ? currentBigBlindUid
      : playerUids.has(hostUid ?? "")
        ? hostUid
        : players[0]?.uid;

  const dealerUid = currentSmallBlindUid
    ? (() => {
        const sbIndex = seatedPlayers.findIndex(
          (p) => p.uid === currentSmallBlindUid,
        );
        if (sbIndex === -1) return undefined;
        const dealerIndex =
          sbIndex === 0 ? seatedPlayers.length - 1 : sbIndex - 1;
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
      (entry) => entry.bettingRound === bettingRound,
    );

    currentRoundActions.forEach((entry) => {
      const actionKey = entry.action.toLowerCase().replace(/\s+/g, "_");
      const translatedAction = tActions(actionKey);

      lastActionByUid.set(entry.uid, translatedAction);

      if (entry.amount !== undefined) {
        lastActionAmountByUid.set(
          entry.uid,
          `${formatAmount(entry.amount)} ${tCommon("currency")}`,
        );
      }
    });
  }

  if (bettingRound === "preflop" && smallBlindAmount && bigBlindAmount) {
    if (currentSmallBlindUid && !lastActionByUid.has(currentSmallBlindUid)) {
      lastActionByUid.set(currentSmallBlindUid, tActions("small_blind"));
      lastActionAmountByUid.set(
        currentSmallBlindUid,
        `${formatAmount(smallBlindAmount)} ${tCommon("currency")}`,
      );
    }

    if (bigBlindUid && !lastActionByUid.has(bigBlindUid)) {
      lastActionByUid.set(bigBlindUid, tActions("big_blind"));
      lastActionAmountByUid.set(
        bigBlindUid,
        `${formatAmount(bigBlindAmount)} ${tCommon("currency")}`,
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
    if (!canArrangeSeats || !selectedSeatUid || selectedSeatUid === targetUid) {
      setSelectedSeatUid(null);
      return;
    }

    const fromIndex = seatedPlayers.findIndex(
      (player) => player.uid === selectedSeatUid,
    );
    const toIndex = seatedPlayers.findIndex(
      (player) => player.uid === targetUid,
    );

    if (fromIndex < 0 || toIndex < 0) {
      setSelectedSeatUid(null);
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
      toast.success(tSettings("settings_saved"));
    } catch (error) {
      const message =
        error instanceof UpdatePlayerSeatsError || error instanceof Error
          ? error.message
          : "Unable to change seats.";
      toast.error(message);
    } finally {
      setSelectedSeatUid(null);
    }
  }

  return (
    <section className="relative mx-auto h-full w-full">
      {/* Active rearrange done button on table */}
      {isArrangingSeats && onExitRearrangeSeats && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute top-2 left-1/2 z-50 -translate-x-1/2">
          <button
            type="button"
            onClick={() => {
              setSelectedSeatUid(null);
              onExitRearrangeSeats();
            }}
            className="rounded-full border border-sky-400/80 bg-black/90 px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md transition-all hover:bg-white/15 active:scale-95"
          >
            {tSettings("done")}
          </button>
        </div>
      )}

      {/* Table outer with blur effect on edges */}
      <div className="absolute top-[47%] left-1/2 h-[70%] w-[58%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
        {/* Main background image/gradient */}
        <div
          className="absolute inset-0 rounded-full border-4 transition-all duration-500"
          style={{
            ...(activeTableTheme.useImage
              ? {
                  backgroundImage: `url(${activeTableTheme.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: activeTableTheme.tableOuter,
                }),
            borderColor: activeTableTheme.tableBorder,
            boxShadow: activeTableTheme.tableGlow,
          }}
        />
        {/* Blurred overlay for edges only */}
        {activeTableTheme.useImage && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `url(${activeTableTheme.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(5px)",
              maskImage:
                "radial-gradient(ellipse at center, transparent 0%, transparent 35%, black 70%, black 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, transparent 0%, transparent 35%, black 70%, black 100%)",
            }}
          />
        )}
        {/* Dark vignette overlay for edges - adds depth */}
        {activeTableTheme.useImage && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 90%, rgba(0,0,0,0.8) 100%)",
            }}
          />
        )}
      </div>
      <div
        className="absolute top-[47%] left-1/2 h-[58%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500"
        style={{
          background: activeTableTheme.tableInner,
          borderColor: activeTableTheme.tableBorder,
        }}
      />

      <div className="absolute top-[47%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        {latestWinnerName ? (
          <div className="animate-in fade-in zoom-in px-5 py-2 duration-500">
            <span className="text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              ผู้ชนะ: {latestWinnerName}
            </span>
          </div>
        ) : null}

        {revealStatus ? (
          <div className="animate-in fade-in zoom-in px-5 py-2 duration-500">
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
            <span className="text-base font-bold text-white">
              {potAmount.toLocaleString()}
            </span>
          </div>
          {currentPlayerContribution !== undefined ? (
            <>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/70">คุณ</span>
                <span className="text-base font-bold text-white">
                  {currentPlayerContribution.toLocaleString()}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <CommunityCards
          bettingRound={bettingRound}
          communityCards={communityCards}
          cardTheme={cardTheme}
          highlightedCards={highlightedCards}
        />

        <div className="font-audiowide text-xs font-bold tracking-wider text-white opacity-80">
          CHIPLESS
        </div>
      </div>

      {seatedPlayers.map((player, index) => {
        // Find tip notification for this player (receiver)
        const playerTipNotification = tipNotifications.find(
          (notif) => notif.toUid === player.uid,
        );

        // Find tip notification sent by this player (sender)
        const senderTipNotification = tipNotifications.find(
          (notif) => notif.fromUid === player.uid,
        );

        // Get recipient name for sender notification
        const senderNotificationData = senderTipNotification
          ? {
              notification: senderTipNotification,
              toName:
                players.find((p) => p.uid === senderTipNotification.toUid)
                  ?.displayName ?? "Unknown",
            }
          : null;

        return (
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
              actionLog !== undefined &&
              actionLog.length > 0
            }
            winStreak={winStreaksByUid?.[player.uid]}
            isExtinguishing={extinguishAnimation?.extinguishedUids.includes(
              player.uid,
            )}
            winnerAmount={winnerAmountsByUid?.[player.uid]}
            lastAction={lastActionByUid.get(player.uid)}
            lastActionAmount={lastActionAmountByUid.get(player.uid)}
            rank={playerRanksByUid.get(player.uid)}
            privateCards={
              player.uid === currentUid
                ? undefined
                : showdownCards?.[player.uid]
            }
            handCategory={getRevealedHandCategory(
              bettingRound,
              player.uid === currentUid ? undefined : showdownCards?.[player.uid],
              communityCards,
            )}
            hideAvatarBadges={bettingRound === "summary"}
            style={getSeatPosition(
              seatCoordinatesByUid.get(player.uid) ??
                getSeatCoordinates(index, seatedPlayers.length),
            )}
            seatCoordinates={
              seatCoordinatesByUid.get(player.uid) ??
              getSeatCoordinates(index, seatedPlayers.length)
            }
            isSelected={isArrangingSeats && selectedSeatUid === player.uid}
            isArrangingSeats={isArrangingSeats}
            tipNotification={playerTipNotification ?? null}
            senderTipNotification={senderNotificationData}
            onTipNotificationComplete={onTipNotificationComplete}
            onClick={() => {
              if (isArrangingSeats) {
                if (!selectedSeatUid) {
                  // Select 1st player
                  setSelectedSeatUid(player.uid);
                } else if (selectedSeatUid === player.uid) {
                  // Deselect
                  setSelectedSeatUid(null);
                } else {
                  // Swap with 2nd player
                  void swapSeats(player.uid);
                }
                return;
              }

              onSelectPlayer?.(player);
            }}
          />
        );
      })}
    </section>
  );
}
