"use client";

import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";

import { ActionPanel } from "@/features/game/action-panel";
import { ChangeNameDialog } from "@/features/game/change-name-dialog";
import { GameHeader } from "@/features/game/game-header";
import { GameTable } from "@/features/game/game-table";
import { PlayerSummaryDialog } from "@/features/game/player-summary-dialog";
import { RoomLeaderboardPanel } from "@/features/game/room-leaderboard-panel";
import { RoomScoreboardDialog } from "@/features/game/room-scoreboard-dialog";
import type { HoldemGameState } from "@/features/game/logic/texas-holdem";
import { useGameSoundEffects } from "@/features/game/use-game-sound-effects";
import { WinnerSelectDialog } from "@/features/game/winner-select-dialog";
import { useTableSkin } from "@/features/game/use-table-skin";
import { TableSkinDialog } from "@/features/game/table-skin-dialog";
import {
  WinnerCelebrationOverlay,
  type WinnerCelebrationData,
} from "@/features/game/winner-celebration-overlay";
import {
  getActiveWinStreaks,
  getLatestExtinguishedWinStreak,
  type ExtinguishedWinStreak,
} from "@/features/game/logic/win-streaks";
import {
  startGame,
  StartGameError,
} from "@/features/rooms/services/start-game";
import {
  startNextHand,
  StartNextHandError,
} from "@/features/rooms/services/start-next-hand";
import {
  deleteRoom,
  DeleteRoomError,
} from "@/features/rooms/services/delete-room";
import {
  kickPlayer,
  KickPlayerError,
} from "@/features/rooms/services/kick-player";
import { foldAndLeaveHand } from "@/features/rooms/services/fold-and-leave-hand";
import { removeStaleRoomPlayer } from "@/features/rooms/services/remove-stale-room-player";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";
import { onDisconnect, ref } from "firebase/database";
import {
  transferRoomHost,
  TransferRoomHostError,
} from "@/features/rooms/services/transfer-room-host";
import {
  getSettlementWinnerUids,
  type HandSettlement,
} from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptySettlements: Record<string, HandSettlement> = {};
const fireEmberStyles: Array<CSSProperties & { id: number }> = Array.from(
  { length: 22 },
  (_, index) => ({
    id: index,
    left: `${(index * 41) % 100}%`,
    width: `${0.24 + ((index * 5) % 10) * 0.03}rem`,
    height: `${0.24 + ((index * 7) % 12) * 0.03}rem`,
    animationDuration: `${1.35 + ((index * 11) % 24) * 0.045}s`,
    animationDelay: `${((index * 13) % 18) * 0.06}s`,
  }),
);
const rainDropStyles: Array<CSSProperties & { id: number }> = Array.from(
  { length: 28 },
  (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    height: `${4.25 + ((index * 11) % 32) * 0.08}rem`,
    animationDuration: `${0.82 + ((index * 13) % 28) * 0.015}s`,
    animationDelay: `${((index * 7) % 18) * 0.045}s`,
  }),
);

type WinnerAmountAnimation = {
  handNumber: number;
  amountsByUid: Record<string, number>;
};

export type GameRoomData = {
  id: string;
  name: string;
  hostUid: string;
  status: "waiting" | "playing";
  gameState?: {
    currentBigBlindUid?: string;
    handNumber?: number;
    hand?: HoldemGameState;
    settlements?: Record<string, HandSettlement>;
  };
  settings: {
    bigBlind: number;
  };
};

export function GameRoomView({
  room,
  players,
  currentUid,
}: {
  room: GameRoomData;
  players: RoomPlayerListItem[];
  currentUid: string;
}) {
  const router = useRouter();
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isStartingNextHand, setIsStartingNextHand] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isDeleteRoomDialogOpen, setIsDeleteRoomDialogOpen] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isLeaveRoomDialogOpen, setIsLeaveRoomDialogOpen] = useState(false);
  const [isHostTransferDialogOpen, setIsHostTransferDialogOpen] = useState(false);
  const [selectedNewHostUid, setSelectedNewHostUid] = useState<string | null>(null);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [isTransferringHost, setIsTransferringHost] = useState(false);
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);
  const [isSkinDialogOpen, setIsSkinDialogOpen] = useState(false);
  const {
    bgTheme,
    tableTheme,
    cardTheme,
    bgThemeId,
    tableThemeId,
    cardThemeId,
    setBgThemeId,
    setTableThemeId,
    setCardThemeId,
  } = useTableSkin();
  const [selectedPlayerForSummary, setSelectedPlayerForSummary] =
    useState<RoomPlayerListItem | null>(null);
  const [onFireAnimationHandNumber, setOnFireAnimationHandNumber] = useState<
    number | null
  >(null);
  const [winnerAmountAnimation, setWinnerAmountAnimation] =
    useState<WinnerAmountAnimation | null>(null);
  const [winnerCelebration, setWinnerCelebration] =
    useState<WinnerCelebrationData | null>(null);
  const [extinguishAnimation, setExtinguishAnimation] =
    useState<ExtinguishedWinStreak | null>(null);
  const isHost = room.hostUid === currentUid;
  const isGameStarted = room.status === "playing";
  const holdemGameState = room.gameState?.hand ?? null;
  const handNumber = room.gameState?.handNumber ?? 1;
  const settlements = room.gameState?.settlements ?? emptySettlements;
  const currentPlayerData = players.find((player) => player.uid === currentUid);
  const currentDisplayName = currentPlayerData?.displayName ?? "";
  const currentPhotoUrl = currentPlayerData?.photoUrl;
  const latestSettlement = Object.values(settlements).sort(
    (first, second) => second.handNumber - first.handNumber,
  )[0];
  const observedLatestSettlementHandRef = useRef<number | null>(
    latestSettlement?.handNumber ?? 0,
  );
  const latestSettlementWinnerNet = useMemo(() => {
    if (!latestSettlement) {
      return 0;
    }

    const winnerUids = getSettlementWinnerUids(latestSettlement);
    if (winnerUids.length === 0) {
      return latestSettlement.pot;
    }

    const totalNet = winnerUids.reduce((sum, uid) => {
      const playerResult = latestSettlement.playerResults?.[uid];
      const net = playerResult?.net ?? 0;
      return sum + Math.max(0, net);
    }, 0);

    return totalNet > 0 ? totalNet : latestSettlement.pot;
  }, [latestSettlement]);
  const recentlySettledWinnerName =
    latestSettlement?.handNumber === handNumber - 1 &&
    (holdemGameState?.actionLog?.length ?? 0) === 0
      ? latestSettlement.winnerName
      : undefined;
  const shouldShowWinnerDialog =
    isHost && holdemGameState?.bettingRound === "showdown";

  const winStreaksByUid = getActiveWinStreaks(settlements);
  const latestExtinguishedWinStreak = useMemo(
    () => getLatestExtinguishedWinStreak(settlements),
    [settlements],
  );
  const currentWinStreak = winStreaksByUid[currentUid] ?? 0;
  const shouldShowExtinguishRain =
    extinguishAnimation?.extinguishedUids.includes(currentUid) ?? false;
  const shouldShowOnFireOverlay = onFireAnimationHandNumber !== null;

  const foldedUids = new Set(
    holdemGameState?.players
      ?.filter((player) => player.hasFolded)
      .map((player) => player.uid) ?? [],
  );
  const activeHandPlayerUids = holdemGameState
    ? new Set(holdemGameState.players.map((player) => player.uid))
    : undefined;
  const isInActiveHand =
    isGameStarted &&
    holdemGameState !== null &&
    holdemGameState.bettingRound !== "summary" &&
    holdemGameState.players.some(
      (player) => player.uid === currentUid && !player.hasFolded,
    );

  const isCurrentPlayerPendingLeave =
    currentPlayerData?.pendingLeave ?? false;

  useEffect(() => {
    if (!isCurrentPlayerPendingLeave) {
      return;
    }

    if (
      holdemGameState === null ||
      holdemGameState.bettingRound === "summary" ||
      room.status === "waiting"
    ) {
      // Cancel the onDisconnect handler FIRST, before deleting the node.
      // If we delete the node first, Firebase server may still try to execute the
      // onDisconnect update on the deleted node → PERMISSION_DENIED.
      const playerRef = ref(
        getRealtimeDatabase(),
        `roomPlayers/${room.id}/${currentUid}`,
      );

      void onDisconnect(playerRef)
        .cancel()
        .catch(() => {
          // Ignore cancel errors
        })
        .finally(() => {
          // Now safe to delete the node via API
          void getFirebaseAuth()
            .currentUser?.getIdToken()
            .then((idToken) =>
              fetch("/api/leave-room", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId: room.id, uid: currentUid, idToken }),
              }),
            )
            .finally(() => {
              toast.success(t("left_after_hand"));
              router.replace("/");
            });
        });
    }
  }, [
    isCurrentPlayerPendingLeave,
    holdemGameState,
    room.status,
    room.id,
    currentUid,
    router,
    t,
  ]);

  useGameSoundEffects({
    roomId: room.id,
    handNumber,
    gameState: holdemGameState,
    settlements,
    currentUid,
  });

  useEffect(() => {
    const latestSettlementHandNumber = latestSettlement?.handNumber ?? null;

    if (latestSettlementHandNumber === null) {
      return;
    }

    if (latestSettlementHandNumber === observedLatestSettlementHandRef.current) {
      return;
    }

    observedLatestSettlementHandRef.current = latestSettlementHandNumber;
    const latestWinnerUids = latestSettlement
      ? getSettlementWinnerUids(latestSettlement)
      : [];
    const winnerAmountsByUid =
      latestSettlement === undefined
        ? {}
        : latestWinnerUids.reduce<Record<string, number>>((amounts, uid) => {
            const net = latestSettlement.playerResults[uid]?.net ?? 0;

            if (net > 0) {
              amounts[uid] = net;
            }

            return amounts;
          }, {});
    const timeoutIds: number[] = [];

    if (
      latestSettlementHandNumber !== null &&
      Object.keys(winnerAmountsByUid).length > 0
    ) {
      const isCurrentUserWinner = latestWinnerUids.includes(currentUid);
      const userWonAmount = winnerAmountsByUid[currentUid] ?? 0;

      // Full-screen golden aura & coin shower celebration: EXCLUSIVELY on winner's device
      if (isCurrentUserWinner && userWonAmount > 0) {
        timeoutIds.push(
          window.setTimeout(() => {
            setWinnerCelebration({
              handNumber: latestSettlementHandNumber,
              winnerNames: [currentDisplayName || "You"],
              totalPot: latestSettlement?.pot,
              isCurrentUserWinner: true,
              wonAmount: userWonAmount,
              currency: tCommon("currency"),
            });
          }, 0),
        );
        timeoutIds.push(
          window.setTimeout(() => {
            setWinnerCelebration((current) =>
              current?.handNumber === latestSettlementHandNumber ? null : current,
            );
          }, 4500),
        );
      }

      // Seat chip amount animation for all winners at the table
      timeoutIds.push(
        window.setTimeout(() => {
          setWinnerAmountAnimation({
            handNumber: latestSettlementHandNumber,
            amountsByUid: winnerAmountsByUid,
          });
        }, 0),
      );
      timeoutIds.push(
        window.setTimeout(() => {
          setWinnerAmountAnimation((current) =>
            current?.handNumber === latestSettlementHandNumber ? null : current,
          );
        }, 1800),
      );
    }

    if (
      latestSettlementHandNumber !== null &&
      latestWinnerUids.includes(currentUid) &&
      currentWinStreak >= 2
    ) {
      timeoutIds.push(
        window.setTimeout(() => {
          setOnFireAnimationHandNumber(latestSettlementHandNumber);
        }, 0),
      );
      timeoutIds.push(
        window.setTimeout(() => {
          setOnFireAnimationHandNumber((current) =>
            current === latestSettlementHandNumber ? null : current,
          );
        }, 2400),
      );
    }

    if (
      !latestExtinguishedWinStreak ||
      latestExtinguishedWinStreak.handNumber !== latestSettlementHandNumber
    ) {
      return () => {
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    timeoutIds.push(
      window.setTimeout(() => {
        setExtinguishAnimation(latestExtinguishedWinStreak);
      }, 0),
    );
    timeoutIds.push(
      window.setTimeout(() => {
        setExtinguishAnimation((current) =>
          current?.handNumber === latestExtinguishedWinStreak.handNumber
            ? null
            : current,
        );
      }, 2400),
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [
    currentUid,
    currentWinStreak,
    latestExtinguishedWinStreak,
    latestSettlement,
    latestSettlement?.handNumber,
  ]);

  async function copyInviteLink() {
    const inviteLink = `${window.location.origin}/join-room?roomId=${encodeURIComponent(room.id)}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Unable to copy invite link.");
    }
  }

  async function handleStartGame() {
    if (isStartingGame) {
      return;
    }

    setIsStartingGame(true);

    try {
      await startGame(room.id);
      toast.success("Game started.");
    } catch (error) {
      const message =
        error instanceof StartGameError || error instanceof Error
          ? error.message
          : "Unable to start game.";
      toast.error(message);
    } finally {
      setIsStartingGame(false);
    }
  }

  async function handleStartNextHand() {
    if (!isHost || isStartingNextHand) {
      return;
    }

    setIsStartingNextHand(true);

    try {
      await startNextHand(room.id);
    } catch (error) {
      const message =
        error instanceof StartNextHandError || error instanceof Error
          ? error.message
          : "Unable to start next hand.";
      toast.error(message);
    } finally {
      setIsStartingNextHand(false);
    }
  }

  async function handleKickPlayer() {
    if (!selectedPlayerForSummary || isKicking) {
      return;
    }

    setIsKicking(true);
    const targetDisplayName = selectedPlayerForSummary.displayName;

    try {
      await kickPlayer({
        roomId: room.id,
        targetUid: selectedPlayerForSummary.uid,
      });
      toast.success(`${targetDisplayName} has been removed from the room.`);
      setSelectedPlayerForSummary(null);
    } catch (error) {
      const message =
        error instanceof KickPlayerError || error instanceof Error
          ? error.message
          : "Unable to kick player.";
      toast.error(message);
    } finally {
      setIsKicking(false);
    }
  }

  async function handleTransferHost() {
    if (!selectedPlayerForSummary || isTransferringHost) {
      return;
    }

    setIsTransferringHost(true);
    const targetDisplayName = selectedPlayerForSummary.displayName ?? "Player";

    try {
      await transferRoomHost({
        roomId: room.id,
        targetUid: selectedPlayerForSummary.uid,
      });
      toast.success(`${targetDisplayName} is now the host.`);
      setSelectedPlayerForSummary(null);
    } catch (error) {
      const message =
        error instanceof TransferRoomHostError || error instanceof Error
          ? error.message
          : "Unable to change host.";
      toast.error(message);
    } finally {
      setIsTransferringHost(false);
    }
  }

  function handleOpenDeleteRoomDialog() {
    if (!isHost || isDeletingRoom) {
      return;
    }

    setIsDeleteRoomDialogOpen(true);
  }

  async function handleDeleteRoom() {
    if (!isHost || isDeletingRoom) {
      return;
    }

    setIsDeleteRoomDialogOpen(false);
    setIsDeletingRoom(true);

    try {
      // Save game history before deleting room (only if there are settlements)
      if (Object.keys(settlements).length > 0) {
        const { saveGameHistory } = await import(
          "@/features/game-history/services/save-game-history"
        );
        await saveGameHistory({
          roomData: {
            id: room.id,
            name: room.name,
            hostUid: room.hostUid,
            settings: room.settings,
          },
          players,
          settlements,
          currentUid,
        });
      }

      await deleteRoom(room.id);
      toast.success("Room deleted.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof DeleteRoomError || error instanceof Error
          ? error.message
          : "Unable to delete room.";
      toast.error(message);
      setIsDeletingRoom(false);
    }
  }

  function handleOpenLeaveRoomDialog() {
    if (isLeavingRoom) {
      return;
    }

    // If host, require selecting new host first
    if (isHost) {
      const otherPlayers = players.filter(p => p.uid !== currentUid);
      if (otherPlayers.length > 0) {
        setIsHostTransferDialogOpen(true);
        setIsLeaveRoomDialogOpen(false);
      } else {
        // No other players, can leave normally
        setIsLeaveRoomDialogOpen(true);
      }
    } else {
      setIsLeaveRoomDialogOpen(true);
    }
  }

  async function handleLeaveRoom() {
    if (isLeavingRoom) {
      return;
    }

    setIsLeavingRoom(true);
    setIsLeaveRoomDialogOpen(false);
    setIsHostTransferDialogOpen(false);

    try {
      if (isInActiveHand) {
        await foldAndLeaveHand({ roomId: room.id });
        toast.info(t("leave_after_hand_notice"));
      } else {
        await removeStaleRoomPlayer({ roomId: room.id, uid: currentUid });
        toast.success(t("left_room"));
        router.replace("/");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to leave room.";
      toast.error(message);
    } finally {
      setIsLeavingRoom(false);
    }
  }

  async function handleTransferHostAndLeave() {
    if (!selectedNewHostUid || isTransferringHost || isLeavingRoom) {
      return;
    }

    setIsTransferringHost(true);

    try {
      await transferRoomHost({
        roomId: room.id,
        targetUid: selectedNewHostUid,
      });
      toast.success("Host transferred successfully.");
      
      // After successful transfer, proceed to leave room directly
      setIsTransferringHost(false);
      setIsHostTransferDialogOpen(false);
      // Call handleLeaveRoom directly without showing dialog
      await handleLeaveRoom();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to transfer host.";
      toast.error(message);
      setIsTransferringHost(false);
    }
  }

  return (
    <div className="fixed inset-0 flex justify-center transition-all duration-500" style={{ background: bgTheme.gradient }}>
      <div className="w-full max-w-md md:max-w-none lg:max-w-lg xl:max-w-xl flex flex-col overflow-hidden p-4 md:p-8 lg:p-4">
      {shouldShowOnFireOverlay ? (
        <div
          className="chipless-on-fire-screen pointer-events-none fixed inset-0 z-40 overflow-hidden"
          aria-hidden="true"
        >
          {fireEmberStyles.map((style) => (
            <span key={style.id} style={style} />
          ))}
        </div>
      ) : null}

      {shouldShowExtinguishRain ? (
        <div
          className="chipless-extinguish-rain pointer-events-none fixed inset-0 z-50 overflow-hidden"
          aria-hidden="true"
        >
          {rainDropStyles.map((style) => (
            <span key={style.id} style={style} />
          ))}
        </div>
      ) : null}

      {/* Header - Fixed height */}
      <div className="shrink-0">
        <GameHeader
          roomName={room.name}
          onCopyInviteLink={copyInviteLink}
          onDeleteRoom={isHost ? handleOpenDeleteRoomDialog : undefined}
          isDeletingRoom={isDeletingRoom}
          onLeaveRoom={handleOpenLeaveRoomDialog}
          isLeavingRoom={isLeavingRoom}
          onOpenMenu={() => setIsScoreboardOpen(true)}
          onOpenSettings={() => setIsSkinDialogOpen(true)}
          leaderboard={
            <RoomLeaderboardPanel
              players={players}
              settlements={settlements}
              currentUid={currentUid}
              isVisible={isLeaderboardVisible}
              onToggleVisible={() =>
                setIsLeaderboardVisible((isVisible) => !isVisible)
              }
              onSelectPlayer={(player) => setSelectedPlayerForSummary(player)}
            />
          }
        />
      </div>

      {/* Game Table - Flexible space, centered */}
      <div className="flex flex-1 items-center justify-center overflow-visible py-2">
        <div className="relative aspect-[4/4.5] w-full max-w-[430px] md:max-w-[600px] lg:max-w-[430px]">
          <GameTable
            roomId={room.id}
            players={players}
            currentUid={currentUid}
            hostUid={room.hostUid}
            canArrangeSeats={
              isHost &&
              (!isGameStarted || holdemGameState?.bettingRound === "summary")
            }
            potAmount={holdemGameState?.pot ?? room.settings.bigBlind}
            currentPlayerContribution={
              holdemGameState?.players.find((player) => player.uid === currentUid)
                ?.totalContribution
            }
            currentSmallBlindUid={
              holdemGameState?.players[holdemGameState.smallBlindPosition]?.uid
            }
            currentBigBlindUid={room.gameState?.currentBigBlindUid}
            smallBlindAmount={Math.max(1, Math.floor(room.settings.bigBlind / 2))}
            bigBlindAmount={room.settings.bigBlind}
            currentTurnUid={
              holdemGameState?.currentTurn === undefined
                ? undefined
                : holdemGameState.players[holdemGameState.currentTurn]?.uid
            }
            activeHandPlayerUids={activeHandPlayerUids}
            foldedUids={foldedUids}
            actionLog={
              isGameStarted ? (holdemGameState?.actionLog ?? []) : undefined
            }
            bettingRound={holdemGameState?.bettingRound}
            latestWinnerName={recentlySettledWinnerName}
            winStreaksByUid={winStreaksByUid}
            extinguishAnimation={extinguishAnimation}
            winnerAmountsByUid={winnerAmountAnimation?.amountsByUid}
            onSelectPlayer={(player) => setSelectedPlayerForSummary(player)}
            tableTheme={tableTheme}
            cardTheme={cardTheme}
          />
        </div>
      </div>

      {/* Action Panel - Fixed height at bottom */}
      <div className="shrink-0 border-t border-white/10 bg-black/50 p-0 backdrop-blur-sm">
        {isGameStarted ? (
          holdemGameState ? (
            holdemGameState.bettingRound === "summary" ? (
              <section className="rounded-2xl border border-white/30 bg-black/85 p-4 text-center shadow-[0_0_24px_rgba(255,255,255,0.1)] space-y-3">
                {latestSettlement ? (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-2.5 text-center">
                    <p className="text-sm font-semibold text-emerald-300">
                      {t("hand_summary_winner", {
                        winnerName: latestSettlement.winnerName,
                        amount: latestSettlementWinnerNet.toLocaleString("en-US"),
                        currency: tCommon("currency"),
                      })}
                    </p>
                  </div>
                ) : null}

                {isHost ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStartNextHand();
                    }}
                    disabled={isStartingNextHand}
                    className="h-12 w-full rounded-xl border border-white bg-white text-base font-bold text-black transition-all hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    {isStartingNextHand
                      ? t("starting_next_hand")
                      : t("start_next_hand")}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1 text-sm text-white/75">
                    <span className="inline-block animate-pulse text-base">🃏</span>
                    <span>{t("waiting_for_next_hand")}</span>
                  </div>
                )}
              </section>
            ) : isCurrentPlayerPendingLeave ? (
              <section className="rounded-2xl border border-rose-500/30 bg-black/85 p-4 text-center shadow-[0_0_24px_rgba(244,63,94,0.1)] space-y-1.5">
                <p className="text-sm font-semibold text-rose-300">
                  {t("leave_after_hand_notice")}
                </p>
              </section>
            ) : (
              <ActionPanel
                key={`${room.id}-${room.gameState?.handNumber ?? 1}-${players.map((player) => player.uid).join("-")}`}
                roomId={room.id}
                initialGameState={holdemGameState}
                currentUid={currentUid}
              />
            )
          ) : (
            <section className="rounded-2xl border border-white/30 bg-black/70 p-4 text-center text-sm text-white/65 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
              {t("waiting")}
            </section>
          )
        ) : (
          <section className="rounded-2xl border border-white/30 bg-black/70 p-4 text-center shadow-[0_0_24px_rgba(255,255,255,0.08)]">
            {isHost ? (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isStartingGame}
                className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingGame ? "Starting..." : "Start Game"}
              </button>
            ) : (
              <p className="text-sm text-white/65">
                Waiting for host to start the game.
              </p>
            )}
          </section>
        )}
      </div>

      <RoomScoreboardDialog
        open={isScoreboardOpen}
        onOpenChange={setIsScoreboardOpen}
        roomId={room.id}
        players={players}
        settlements={settlements}
        currentUid={currentUid}
        canEditWinners={isHost}
        onChangeName={() => setIsChangeNameOpen(true)}
        onSelectPlayer={(player) => setSelectedPlayerForSummary(player)}
      />

      <PlayerSummaryDialog
        key={selectedPlayerForSummary?.uid ?? "empty"}
        open={selectedPlayerForSummary !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlayerForSummary(null);
          }
        }}
        targetPlayer={selectedPlayerForSummary}
        settlements={settlements}
        players={players}
        currentUid={currentUid}
        hostUid={room.hostUid}
        onEditProfile={() => setIsChangeNameOpen(true)}
        onKick={handleKickPlayer}
        isKicking={isKicking}
        onTransferHost={isHost ? handleTransferHost : undefined}
        isTransferringHost={isTransferringHost}
      />

      <ChangeNameDialog
        roomId={room.id}
        currentDisplayName={currentDisplayName}
        currentPhotoUrl={currentPhotoUrl}
        open={isChangeNameOpen}
        onOpenChange={setIsChangeNameOpen}
      />

      {holdemGameState ? (
        <WinnerSelectDialog
          roomId={room.id}
          handNumber={handNumber}
          hand={holdemGameState}
          open={shouldShowWinnerDialog}
        />
      ) : null}

      <Dialog
        open={isDeleteRoomDialogOpen}
        onOpenChange={setIsDeleteRoomDialogOpen}
      >
        <DialogContent className="border-rose-500/35 bg-black/95 text-white shadow-[0_0_32px_rgba(244,63,94,0.15)] sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Delete room?</DialogTitle>
            <DialogDescription className="text-white/65">
              This will remove "{room.name}" and disconnect all players.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteRoomDialogOpen(false)}
              disabled={isDeletingRoom}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleDeleteRoom();
              }}
              disabled={isDeletingRoom}
              className="bg-rose-500 text-white hover:bg-rose-400"
            >
              {isDeletingRoom ? "Deleting..." : "Delete room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Host Transfer Dialog */}
      <Dialog
        open={isHostTransferDialogOpen}
        onOpenChange={setIsHostTransferDialogOpen}
      >
        <DialogContent className="border-white/30 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.12)] sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>{t("transfer_host_before_leaving")}</DialogTitle>
            <DialogDescription className="text-white/65">
              {t("transfer_host_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {players
              .filter(player => player.uid !== currentUid)
              .map(player => (
                <button
                  key={player.uid}
                  type="button"
                  onClick={() => setSelectedNewHostUid(player.uid)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedNewHostUid === player.uid
                      ? 'border-yellow-500/60 bg-yellow-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="relative size-10 rounded-full overflow-hidden border-2 border-white/20">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.displayName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-white/10 text-white">
                        {player.displayName?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{player.displayName}</p>
                  </div>
                  {selectedNewHostUid === player.uid && (
                    <div className="text-yellow-500">
                      <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsHostTransferDialogOpen(false);
                setSelectedNewHostUid(null);
              }}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleTransferHostAndLeave();
              }}
              disabled={!selectedNewHostUid || isTransferringHost}
              className="bg-white text-black hover:bg-neutral-100"
            >
              {isTransferringHost ? t("transferring") : t("transfer_and_leave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isLeaveRoomDialogOpen}
        onOpenChange={setIsLeaveRoomDialogOpen}
      >
        <DialogContent
          className={`bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.12)] sm:max-w-sm ${
            isInActiveHand ? "border-rose-500/40" : "border-white/30"
          }`}
        >
          <DialogHeader className="text-left">
            <DialogTitle className={isInActiveHand ? "text-rose-400 font-bold" : ""}>
              {isInActiveHand ? t("leave_in_hand_title") : t("leave_room")}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {isInActiveHand
                ? t("leave_in_hand_warning")
                : t("leave_room_description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLeaveRoomDialogOpen(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {isInActiveHand ? t("stay_in_game") : tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleLeaveRoom();
              }}
              disabled={isLeavingRoom}
              className={
                isInActiveHand
                  ? "bg-rose-600 text-white hover:bg-rose-500"
                  : "bg-white text-black hover:bg-neutral-100"
              }
            >
              {isLeavingRoom
                ? t("leaving_room")
                : isInActiveHand
                  ? t("confirm_leave")
                  : t("leave_room")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableSkinDialog
        open={isSkinDialogOpen}
        bgThemeId={bgThemeId}
        tableThemeId={tableThemeId}
        cardThemeId={cardThemeId}
        onSelectBg={setBgThemeId}
        onSelectTable={setTableThemeId}
        onSelectCard={setCardThemeId}
        onClose={() => setIsSkinDialogOpen(false)}
      />

      <WinnerCelebrationOverlay
        data={winnerCelebration}
        onComplete={() => setWinnerCelebration(null)}
      />
      </div>
    </div>
  );
}
