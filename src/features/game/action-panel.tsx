"use client";

import { Minus, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  t,
}: {
  action: AvailableAction;
  betAmount: number;
  maxAmount: number;
  t: (key: string) => string;
}): string {
  if (action.type === "bet" || action.type === "raise") {
    return `${t(action.type)} ${formatAmount(getAggressiveActionAmount(action, betAmount, maxAmount))}`;
  }

  if (action.type === "call") {
    return `${t(action.type)} ${formatAmount(action.amount)}`;
  }

  return t(action.type);
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
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("actions");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "check-fold" | "check" | "call" | "call-any" | null
  >(null);
  const [pendingCallAmount, setPendingCallAmount] = useState<number>(0);
  const gameState = initialGameState;
  const currentPosition = gameState.players.findIndex(
    (player) => player.uid === currentUid,
  );
  const currentTurnPlayer = gameState.players[gameState.currentTurn];
  const currentPlayer = gameState.players[currentPosition];
  const isCurrentPlayerTurn = currentPosition === gameState.currentTurn;
  const amountToCall = getAmountToCall(gameState, currentPosition);
  const availableActions = getAvailableActions(gameState, currentPosition);
  const isPreflopNonBlind =
    gameState.bettingRound === "preflop" &&
    currentPosition !== gameState.bigBlindPosition &&
    currentPosition !== gameState.smallBlindPosition;
  const preflopCallAmount = amountToCall > 0 ? amountToCall : gameState.bigBlind;
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

  const sliderProgress =
    maximumActionAmount === minimumActionAmount
      ? 100
      : ((currentBet - minimumActionAmount) /
          (maximumActionAmount - minimumActionAmount)) *
        100;

  const [prevRound, setPrevRound] = useState(gameState.bettingRound);
  if (gameState.bettingRound !== prevRound) {
    setPrevRound(gameState.bettingRound);
    setPendingAction(null);
    setPendingCallAmount(0);
  }

  async function runAction(action: AvailableAction): Promise<void> {
    if (isSubmittingAction) {
      return;
    }

    setPendingAction(null);
    setPendingCallAmount(0);

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

  const runActionRef = useRef(runAction);
  useEffect(() => {
    runActionRef.current = runAction;
  });

  // Cancel pending check if someone places a bet before our turn
  useEffect(() => {
    if (pendingAction === "check" && amountToCall > 0) {
      queueMicrotask(() => {
        setPendingAction(null);
      });
    }
  }, [pendingAction, amountToCall]);

  // Cancel pending call if someone raises the bet above our pending amount before our turn
  useEffect(() => {
    if (
      pendingAction === "call" &&
      amountToCall > pendingCallAmount &&
      pendingCallAmount > 0
    ) {
      queueMicrotask(() => {
        setPendingAction(null);
        setPendingCallAmount(0);
      });
    }
  }, [pendingAction, amountToCall, pendingCallAmount]);

  // Auto-execute pending action when it's player's turn
  useEffect(() => {
    if (
      isCurrentPlayerTurn &&
      pendingAction &&
      !isSubmittingAction &&
      !currentPlayer?.hasFolded
    ) {
      const action = pendingAction;

      setTimeout(() => {
        if (action === "check-fold") {
          // Check/Fold: Check if no one bet, Fold if someone bet
          if (availableActions.some((a) => a.type === "check")) {
            void runActionRef.current({ type: "check", label: "Check" });
          } else {
            void runActionRef.current({ type: "fold", label: "Fold" });
          }
        } else if (action === "check") {
          // Check: Only check if still available, otherwise cancel
          if (availableActions.some((a) => a.type === "check")) {
            void runActionRef.current({ type: "check", label: "Check" });
          } else {
            // Someone bet, cancel the pre-action
            setPendingAction(null);
          }
        } else if (action === "call") {
          const callAction = availableActions.find((a) => a.type === "call");
          if (callAction && callAction.amount <= pendingCallAmount) {
            void runActionRef.current(callAction);
          } else if (availableActions.some((a) => a.type === "check")) {
            void runActionRef.current({ type: "check", label: "Check" });
          } else {
            setPendingAction(null);
            setPendingCallAmount(0);
          }
        } else if (action === "call-any") {
          // Call Any: Call if someone bet, or Check if nobody bet
          const callAction = availableActions.find((a) => a.type === "call");
          const checkAction = availableActions.find((a) => a.type === "check");
          if (callAction) {
            void runActionRef.current(callAction);
          } else if (checkAction) {
            void runActionRef.current(checkAction);
          } else {
            setPendingAction(null);
          }
        }
      }, 0);
    }
  }, [
    isCurrentPlayerTurn,
    pendingAction,
    isSubmittingAction,
    currentPlayer?.hasFolded,
    availableActions,
    pendingCallAmount,
  ]);

  return (
    <section className="rounded-xl border border-white/30 bg-black/70 p-3 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/55">{t("your_bet")}</p>
          <div className="flex items-baseline text-white">
            <span className="inline-block w-[3.3rem] text-2xl font-semibold tabular-nums">
              {formatAmount(currentBet)}
            </span>
            <span className="text-sm font-semibold text-white/45">{tCommon("currency")}</span>
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
          aria-label={t("decrease_bet")}
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
            aria-label={t("bet_amount")}
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
          aria-label={t("increase_bet")}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {/* Pre-action buttons for players not their turn */}
        {!isCurrentPlayerTurn && !currentPlayer?.hasFolded && (
          <>
            {/* Check/Fold Button */}
            <button
              type="button"
              onClick={() => {
                setPendingAction((prev) => (prev === "check-fold" ? null : "check-fold"));
              }}
              disabled={isSubmittingAction}
              className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                pendingAction === "check-fold" ? 'border-yellow-500/60 bg-yellow-500/20' : 'border-white/35 bg-white/15'
              }`}
            >
              {tActions("check_fold")}
            </button>

            {/* Middle button: In preflop for non-BB/SB: "ตาม [amount]" (e.g. "ตาม 2"), else "ผ่าน" */}
            {isPreflopNonBlind ? (
              <button
                type="button"
                onClick={() => {
                  if (pendingAction === "call") {
                    setPendingAction(null);
                    setPendingCallAmount(0);
                  } else {
                    setPendingAction("call");
                    setPendingCallAmount(preflopCallAmount);
                  }
                }}
                disabled={isSubmittingAction}
                className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                  pendingAction === "call"
                    ? "border-yellow-500/60 bg-yellow-500/20"
                    : "border-white/35 bg-white/15"
                }`}
              >
                {`${tActions("call")} ${formatAmount(preflopCallAmount)}`}
              </button>
            ) : (
              /* Check Button */
              <button
                type="button"
                onClick={() => {
                  setPendingAction((prev) => (prev === "check" ? null : "check"));
                }}
                disabled={isSubmittingAction}
                className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                  pendingAction === "check"
                    ? "border-yellow-500/60 bg-yellow-500/20"
                    : "border-white/35 bg-white/15"
                }`}
              >
                {tActions("check")}
              </button>
            )}

            {/* Call Any Button */}
            <button
              type="button"
              onClick={() => {
                setPendingAction((prev) => (prev === "call-any" ? null : "call-any"));
              }}
              disabled={isSubmittingAction}
              className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                pendingAction === "call-any" ? 'border-yellow-500/60 bg-yellow-500/20' : 'border-white/35 bg-white/15'
              }`}
            >
              {tActions("call_any")}
            </button>
          </>
        )}

        {/* Regular action buttons for current player's turn */}
        {isCurrentPlayerTurn && availableActions.map((action) => {
          const isBetOrRaise = action.type === "bet" || action.type === "raise";
          return (
            <button
              key={action.type}
              type="button"
              onClick={() => {
                void runAction(action);
              }}
              disabled={
                isSubmittingAction ||
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
              className={`h-9 flex-1 min-w-20 rounded-lg border px-1 text-xs font-semibold transition-all duration-150 disabled:opacity-35 ${
                isBetOrRaise
                  ? "border-sky-400/70 bg-sky-500/30 text-sky-100 shadow-[inset_0_0_14px_rgba(14,165,233,0.3),0_0_12px_rgba(14,165,233,0.25)] hover:border-sky-300 hover:bg-sky-500/40"
                  : "border-white/35 bg-white/15 text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] hover:border-white/50 hover:bg-white/25"
              }`}
            >
              {getActionButtonLabel({
                action,
                betAmount: currentBet,
                maxAmount: maximumActionAmount,
                t: tActions,
              })}
            </button>
          );
        })}
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
