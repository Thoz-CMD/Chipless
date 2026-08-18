"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

import { ActionPanel } from "@/features/game/action-panel";
import { ChangeNameDialog } from "@/features/game/change-name-dialog";
import { GameHeader } from "@/features/game/game-header";
import { GameTable } from "@/features/game/game-table";
import { PlayerSummaryDialog } from "@/features/game/player-summary-dialog";
import { RoomScoreboardDialog } from "@/features/game/room-scoreboard-dialog";
import type { HoldemGameState } from "@/features/game/logic/texas-holdem";
import { useGameSoundEffects } from "@/features/game/use-game-sound-effects";
import { WinnerSelectDialog } from "@/features/game/winner-select-dialog";
import { getActiveWinStreaks } from "@/features/game/logic/win-streaks";
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
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

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
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
  const [isKicking, setIsKicking] = useState(false);
  const [selectedPlayerForSummary, setSelectedPlayerForSummary] =
    useState<RoomPlayerListItem | null>(null);
  const isHost = room.hostUid === currentUid;
  const isGameStarted = room.status === "playing";
  const holdemGameState = room.gameState?.hand ?? null;
  const handNumber = room.gameState?.handNumber ?? 1;
  const settlements = room.gameState?.settlements ?? {};
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

  const foldedUids = new Set(
    holdemGameState?.players
      ?.filter((player) => player.hasFolded)
      .map((player) => player.uid) ?? [],
  );

  useGameSoundEffects({
    roomId: room.id,
    handNumber,
    gameState: holdemGameState,
    settlements,
    currentUid,
  });

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

  async function handleDeleteRoom() {
    if (!isHost || isDeletingRoom) {
      return;
    }

    const confirmed = window.confirm(
      `Delete room "${room.name}"?\n\nThis will remove the room and disconnect all players.`,
    );

    if (!confirmed) {
      return;
    }

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

  return (
    <div className="space-y-5">
      <GameHeader
        roomName={room.name}
        playerCount={players.length}
        onCopyInviteLink={copyInviteLink}
        onDeleteRoom={isHost ? handleDeleteRoom : undefined}
        isDeletingRoom={isDeletingRoom}
        onOpenMenu={() => setIsScoreboardOpen(true)}
      />

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
        currentBigBlindUid={room.gameState?.currentBigBlindUid}
        currentTurnUid={
          holdemGameState?.currentTurn === undefined
            ? undefined
            : holdemGameState.players[holdemGameState.currentTurn]?.uid
        }
        foldedUids={foldedUids}
        actionLog={
          isGameStarted ? (holdemGameState?.actionLog ?? []) : undefined
        }
        bettingRound={holdemGameState?.bettingRound}
        latestWinnerName={recentlySettledWinnerName}
        winStreaksByUid={winStreaksByUid}
        onSelectPlayer={(player) => setSelectedPlayerForSummary(player)}
      />

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

      <RoomScoreboardDialog
        open={isScoreboardOpen}
        onOpenChange={setIsScoreboardOpen}
        players={players}
        settlements={settlements}
        currentUid={currentUid}
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
    </div>
  );
}
