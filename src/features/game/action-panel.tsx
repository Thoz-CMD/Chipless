"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  getAvailableActions,
  getAmountToCall,
  type AvailableAction,
  type HoldemAction,
  type HoldemGameState,
} from "@/features/game/logic/texas-holdem";
import {
  submitGameAction,
  SubmitGameActionError,
} from "@/features/rooms/services/submit-game-action";

const maxBetAmount: number = 100;
const minBetAmount: number = 1;

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

function clampBet(amount: number, minBet: number, maxBet: number): number {
  return Math.min(Math.max(Math.round(amount), minBet), maxBet);
}

function getAggressiveActionAmount(
  action: Extract<AvailableAction, { type: "bet" | "raise" }>,
  betAmount: number,
  maxAmount: number,
): number {
  return clampBet(
    Math.max(betAmount, action.minimumAmount),
    minBetAmount,
    maxAmount,
  );
}

function getActionButtonLabel({
  action,
  betAmount,
  maxAmount,
}: {
  action: AvailableAction;
  betAmount: number;
  maxAmount: number;
}): string {
  if (action.type === "bet" || action.type === "raise") {
    return `${action.label} ${formatAmount(getAggressiveActionAmount(action, betAmount, maxAmount))}`;
  }

  return action.label;
}

function isAggressiveAction(
  action: AvailableAction,
): action is Extract<AvailableAction, { type: "bet" | "raise" }> {
  return action.type === "bet" || action.type === "raise";
}

function getAggressiveActionCost({
  action,
  amount,
  amountToCall,
  currentBet,
}: {
  action: Extract<AvailableAction, { type: "bet" | "raise" }>;
  amount: number;
  amountToCall: number;
  currentBet: number;
}): number {
  if (action.type === "bet") {
    return amount;
  }

  return amountToCall + Math.max(0, amount - currentBet);
}

function getMaxAffordableActionAmount({
  action,
  playerStack,
  amountToCall,
  currentBet,
}: {
  action: Extract<AvailableAction, { type: "bet" | "raise" }>;
  playerStack: number;
  amountToCall: number;
  currentBet: number;
}): number {
  if (action.type === "bet") {
    return playerStack;
  }

  return currentBet + Math.max(0, playerStack - amountToCall);
}

export function ActionPanel({
  roomId,
  initialGameState,
  currentUid,
}: {
  roomId: string;
  initialGameState: HoldemGameState;
  currentUid: string;
}) {
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const gameState = initialGameState;
  const currentPosition = gameState.players.findIndex(
    (player) => player.uid === currentUid,
  );
  const currentTurnPlayer = gameState.players[gameState.currentTurn];
  const currentPlayer = gameState.players[currentPosition];
  const isCurrentPlayerTurn = currentPosition === gameState.currentTurn;
  const amountToCall = getAmountToCall(gameState, currentPosition);
  const availableActions = getAvailableActions(gameState, currentPosition);
  const aggressiveAction = availableActions.find((action) =>
    isAggressiveAction(action),
  );
  const minimumActionAmount = aggressiveAction?.minimumAmount ?? minBetAmount;
  const maxAffordableActionAmount = aggressiveAction
    ? getMaxAffordableActionAmount({
        action: aggressiveAction,
        playerStack: currentPlayer?.stack ?? 0,
        amountToCall,
        currentBet: gameState.currentBet,
      })
    : maxBetAmount;
  const maximumActionAmount = aggressiveAction
    ? Math.max(
        minimumActionAmount,
        Math.min(maxBetAmount, maxAffordableActionAmount),
      )
    : maxBetAmount;
  const [betAmount, setBetAmount] = useState(() => minBetAmount);
  const currentBet = clampBet(
    betAmount,
    minimumActionAmount,
    maximumActionAmount,
  );

  const presets = [
    {
      label: `Min (${formatAmount(minimumActionAmount)})`,
      value: minimumActionAmount,
    },
    {
      label: `\u00d72 (${formatAmount(clampBet(minimumActionAmount * 2, minimumActionAmount, maximumActionAmount))})`,
      value: clampBet(
        minimumActionAmount * 2,
        minimumActionAmount,
        maximumActionAmount,
      ),
    },
    {
      label: `\u00d72.5 (${formatAmount(clampBet(minimumActionAmount * 2.5, minimumActionAmount, maximumActionAmount))})`,
      value: clampBet(
        minimumActionAmount * 2.5,
        minimumActionAmount,
        maximumActionAmount,
      ),
    },
    {
      label: `\u00d73 (${formatAmount(clampBet(minimumActionAmount * 3, minimumActionAmount, maximumActionAmount))})`,
      value: clampBet(
        minimumActionAmount * 3,
        minimumActionAmount,
        maximumActionAmount,
      ),
    },
  ];

  const sliderProgress =
    maximumActionAmount === minimumActionAmount
      ? 100
      : ((currentBet - minimumActionAmount) /
          (maximumActionAmount - minimumActionAmount)) *
        100;

  async function runAction(action: AvailableAction): Promise<void> {
    if (isSubmittingAction) {
      return;
    }

    let holdemAction: HoldemAction;

    if (action.type === "bet" || action.type === "raise") {
      const actionAmount = getAggressiveActionAmount(
        action,
        currentBet,
        maximumActionAmount,
      );

      setBetAmount(actionAmount);
      holdemAction = { type: action.type, amount: actionAmount };
    } else if (action.type === "call") {
      holdemAction = { type: "call", amount: action.amount };
    } else if (action.type === "fold") {
      holdemAction = { type: "fold" };
    } else {
      holdemAction = { type: "check" };
    }

    setIsSubmittingAction(true);

    try {
      await submitGameAction(roomId, holdemAction);
    } catch (error) {
      const message =
        error instanceof SubmitGameActionError || error instanceof Error
          ? error.message
          : "Unable to submit action.";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/30 bg-black/70 p-3 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/55">Your Bet</p>
          <div className="flex items-baseline text-white">
            <span className="inline-block w-[3.3rem] text-2xl font-semibold tabular-nums">
              {formatAmount(currentBet)}
            </span>
            <span className="text-sm font-semibold text-white/45">THB</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setBetAmount((current) =>
              clampBet(current - 1, minimumActionAmount, maximumActionAmount),
            )
          }
          disabled={currentBet <= minimumActionAmount}
          className="grid size-10 place-items-center rounded-lg border border-white/25 text-white/70 disabled:opacity-35"
          aria-label="Decrease bet"
        >
          <Minus className="size-5" aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <input
            type="range"
            min={minimumActionAmount}
            max={maximumActionAmount}
            step={1}
            value={currentBet}
            onChange={(event) => {
              setBetAmount(
                clampBet(
                  Number(event.target.value),
                  minimumActionAmount,
                  maximumActionAmount,
                ),
              );
            }}
            className="chipless-bet-slider h-7 w-full cursor-pointer appearance-none rounded-full bg-white/20"
            style={{
              background: `linear-gradient(to right, white 0%, white ${sliderProgress}%, rgba(255,255,255,0.2) ${sliderProgress}%, rgba(255,255,255,0.2) 100%)`,
            }}
            aria-label="Bet amount"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            setBetAmount((current) =>
              clampBet(current + 1, minimumActionAmount, maximumActionAmount),
            )
          }
          disabled={currentBet >= maximumActionAmount}
          className="grid size-10 place-items-center rounded-lg border border-white/25 text-white/70 disabled:opacity-35"
          aria-label="Increase bet"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setBetAmount(preset.value)}
            className="h-9 rounded-lg border border-white/20 bg-white/5 px-1 text-[11px] text-white/65"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {availableActions.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => {
              void runAction(action);
            }}
            disabled={
              isSubmittingAction ||
              !isCurrentPlayerTurn ||
              (isAggressiveAction(action) &&
                (maxAffordableActionAmount < minimumActionAmount ||
                  getAggressiveActionCost({
                    action,
                    amount: getAggressiveActionAmount(
                      action,
                      currentBet,
                      maximumActionAmount,
                    ),
                    amountToCall,
                    currentBet: gameState.currentBet,
                  }) > (currentPlayer?.stack ?? 0)))
            }
            className="h-9 w-[30%] min-w-20 rounded-lg border border-white/35 bg-white/15 px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)]"
          >
            {getActionButtonLabel({
              action,
              betAmount: currentBet,
              maxAmount: maximumActionAmount,
            })}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-white/45">
        <span>
          {isCurrentPlayerTurn
            ? "Your action"
            : `Waiting for ${currentTurnPlayer?.displayName ?? "player"}`}
        </span>
        <span>{gameState.bettingRound}</span>
      </div>
    </section>
  );
}
