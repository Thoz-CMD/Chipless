"use client";

import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

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
  deleteRoom,
  DeleteRoomError,
} from "@/features/rooms/services/delete-room";
import {
  kickPlayer,
  KickPlayerError,
} from "@/features/rooms/services/kick-player";
import { removeStaleRoomPlayer } from "@/features/rooms/services/remove-stale-room-player";
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
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isDeleteRoomDialogOpen, setIsDeleteRoomDialogOpen] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isLeaveRoomDialogOpen, setIsLeaveRoomDialogOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [isTransferringHost, setIsTransferringHost] = useState(false);
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);
  const [selectedPlayerForSummary, setSelectedPlayerForSummary] =
    useState<RoomPlayerListItem | null>(null);
  const [onFireAnimationHandNumber, setOnFireAnimationHandNumber] = useState<
    number | null
  >(null);
  const [winnerAmountAnimation, setWinnerAmountAnimation] =
    useState<WinnerAmountAnimation | null>(null);
  const [extinguishAnimation, setExtinguishAnimation] =
    useState<ExtinguishedWinStreak | null>(null);
  const observedLatestSettlementHandRef = useRef<number | null>(null);
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

  useGameSoundEffects({
    roomId: room.id,
    handNumber,
    gameState: holdemGameState,
    settlements,
    currentUid,
  });

  useEffect(() => {
    const latestSettlementHandNumber = latestSettlement?.handNumber ?? null;

    if (observedLatestSettlementHandRef.current === null) {
      observedLatestSettlementHandRef.current = latestSettlementHandNumber;
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

  async function handleLeaveRoom() {
    if (isLeavingRoom) {
      return;
    }

    setIsLeavingRoom(true);
    setIsLeaveRoomDialogOpen(false);

    try {
      await removeStaleRoomPlayer({ roomId: room.id, uid: currentUid });
      toast.success("Left the room.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to leave room.";
      toast.error(message);
    } finally {
      setIsLeavingRoom(false);
    }
  }

  return (
    <div className="fixed inset-0 flex justify-center">
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
          onLeaveRoom={() => setIsLeaveRoomDialogOpen(true)}
          isLeavingRoom={isLeavingRoom}
          onOpenMenu={() => setIsScoreboardOpen(true)}
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
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div className="relative aspect-[3/4] w-full max-w-[430px] md:max-w-[600px] lg:max-w-[430px]">
          <GameTable
            roomId={room.id}
            players={players}
            currentUid={currentUid}
            hostUid={room.hostUid}
            canArrangeSeats={isHost}
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
          />
        </div>
      </div>

      {/* Action Panel - Fixed height at bottom */}
      <div className="shrink-0 border-t border-white/10 bg-black/50 p-0 backdrop-blur-sm">
        {isGameStarted ? (
          holdemGameState ? (
            <ActionPanel
              key={`${room.id}-${room.gameState?.handNumber ?? 1}-${players.map((player) => player.uid).join("-")}`}
              roomId={room.id}
              initialGameState={holdemGameState}
              currentUid={currentUid}
            />
          ) : (
            <section className="rounded-2xl border border-white/30 bg-black/70 p-4 text-center text-sm text-white/65 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
              Waiting for more players.
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

      <Dialog
        open={isLeaveRoomDialogOpen}
        onOpenChange={setIsLeaveRoomDialogOpen}
      >
        <DialogContent className="border-white/30 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.12)] sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Leave room?</DialogTitle>
            <DialogDescription className="text-white/65">
              You will be removed from this room immediately.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLeaveRoomDialogOpen(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleLeaveRoom();
              }}
              disabled={isLeavingRoom}
              className="bg-white text-black hover:bg-neutral-100"
            >
              {isLeavingRoom ? "Leaving..." : "Leave room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
