"use client";

import { toast } from "sonner";
import { useState } from "react";

import { ActionPanel } from "@/features/game/action-panel";
import { GameHeader } from "@/features/game/game-header";
import { GameTable } from "@/features/game/game-table";
import { RoomScoreboardDialog } from "@/features/game/room-scoreboard-dialog";
import type { HoldemGameState } from "@/features/game/logic/texas-holdem";
import { useGameSoundEffects } from "@/features/game/use-game-sound-effects";
import { WinnerSelectDialog } from "@/features/game/winner-select-dialog";
import {
  startGame,
  StartGameError,
} from "@/features/rooms/services/start-game";
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
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const isHost = room.hostUid === currentUid;
  const isGameStarted = room.status === "playing";
  const holdemGameState = room.gameState?.hand ?? null;
  const handNumber = room.gameState?.handNumber ?? 1;
  const settlements = room.gameState?.settlements ?? {};
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

  return (
    <div className="space-y-5">
      <GameHeader
        roomName={room.name}
        playerCount={players.length}
        onCopyInviteLink={copyInviteLink}
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
        actionLog={
          isGameStarted ? (holdemGameState?.actionLog ?? []) : undefined
        }
        bettingRound={holdemGameState?.bettingRound}
        latestWinnerName={recentlySettledWinnerName}
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
