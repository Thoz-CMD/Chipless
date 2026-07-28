"use client";

import { useEffect, useRef } from "react";

import type {
  HoldemActionLogEntry,
  HoldemGameState,
} from "@/features/game/logic/texas-holdem";
import {
  playCardSound,
  playCheckSound,
  playChipSound,
  playFoldSound,
  playTurnAlertSound,
  playWinnerSound,
} from "@/features/game/sound-effects";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";

const playedActionSoundKeys = new Set<string>();
const maxPlayedActionSoundKeys = 120;

function rememberPlayedActionSoundKey(actionKey: string): boolean {
  if (playedActionSoundKeys.has(actionKey)) {
    return false;
  }

  playedActionSoundKeys.add(actionKey);

  if (playedActionSoundKeys.size > maxPlayedActionSoundKeys) {
    const oldestKey = playedActionSoundKeys.values().next().value;

    if (typeof oldestKey === "string") {
      playedActionSoundKeys.delete(oldestKey);
    }
  }

  return true;
}

function claimCrossTabActionSound(actionKey: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const storageKey = `chipless:sound:${actionKey}`;

  try {
    if (window.localStorage.getItem(storageKey)) {
      return false;
    }

    window.localStorage.setItem(storageKey, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function getLatestAction(
  gameState: HoldemGameState | null,
): HoldemActionLogEntry | undefined {
  return gameState?.actionLog?.at(-1);
}

function getLatestActionKey({
  gameState,
  roomId,
  handNumber,
}: {
  gameState: HoldemGameState | null;
  roomId: string;
  handNumber: number;
}): string | null {
  const action = getLatestAction(gameState);

  if (!action) {
    return null;
  }

  return [
    roomId,
    handNumber,
    action.bettingRound,
    action.id,
    action.uid,
    action.action,
    action.amount ?? 0,
  ].join(":");
}

function playLatestActionSound({
  gameState,
  currentUid,
}: {
  gameState: HoldemGameState | null;
  currentUid: string;
}) {
  const latestAction = getLatestAction(gameState);
  const action = latestAction?.action;

  if (!latestAction || latestAction.uid !== currentUid) {
    return;
  }

  if (action === "Call" || action === "Bet" || action === "Raise") {
    playChipSound();
    return;
  }

  if (action === "Check") {
    playCheckSound();
    return;
  }

  if (action === "Fold") {
    playFoldSound();
  }
}

function getLatestSettlementHandNumber(
  settlements: Record<string, HandSettlement>,
): number | null {
  const latestSettlement = Object.values(settlements).sort(
    (first, second) => second.handNumber - first.handNumber,
  )[0];

  return latestSettlement?.handNumber ?? null;
}

export function useGameSoundEffects({
  roomId,
  handNumber,
  gameState,
  settlements,
  currentUid,
}: {
  roomId: string;
  handNumber: number;
  gameState: HoldemGameState | null;
  settlements: Record<string, HandSettlement>;
  currentUid: string;
}) {
  const hasMounted = useRef(false);
  const previousActionKey = useRef<string | null>(null);
  const previousBettingRound = useRef(gameState?.bettingRound);
  const previousTurnUid = useRef<string | undefined>(
    gameState?.players[gameState.currentTurn]?.uid,
  );
  const previousSettlementHandNumber = useRef<number | null>(
    getLatestSettlementHandNumber(settlements),
  );

  useEffect(() => {
    const latestActionKey = getLatestActionKey({
      gameState,
      roomId,
      handNumber,
    });
    const currentBettingRound = gameState?.bettingRound;
    const currentTurnUid = gameState?.players[gameState.currentTurn]?.uid;
    const latestSettlementHandNumber =
      getLatestSettlementHandNumber(settlements);

    if (!hasMounted.current) {
      hasMounted.current = true;
      previousActionKey.current = latestActionKey;
      previousBettingRound.current = currentBettingRound;
      previousTurnUid.current = currentTurnUid;
      previousSettlementHandNumber.current = latestSettlementHandNumber;
      return;
    }

    if (
      latestActionKey !== null &&
      latestActionKey !== previousActionKey.current &&
      rememberPlayedActionSoundKey(latestActionKey) &&
      claimCrossTabActionSound(latestActionKey)
    ) {
      playLatestActionSound({ gameState, currentUid });
    }

    if (
      currentBettingRound !== undefined &&
      currentBettingRound !== previousBettingRound.current &&
      (currentBettingRound === "flop" ||
        currentBettingRound === "turn" ||
        currentBettingRound === "river" ||
        currentBettingRound === "showdown")
    ) {
      playCardSound();
    }

    if (
      currentTurnUid === currentUid &&
      previousTurnUid.current !== currentUid &&
      gameState?.bettingRound !== "showdown"
    ) {
      playTurnAlertSound();
    }

    if (
      latestSettlementHandNumber !== null &&
      latestSettlementHandNumber !== previousSettlementHandNumber.current
    ) {
      playWinnerSound();
    }

    previousActionKey.current = latestActionKey;
    previousBettingRound.current = currentBettingRound;
    previousTurnUid.current = currentTurnUid;
    previousSettlementHandNumber.current = latestSettlementHandNumber;
  }, [currentUid, gameState, handNumber, roomId, settlements]);
}
