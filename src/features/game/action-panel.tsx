"use client";

import { Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [pendingAction, setPendingAction] = useState<"check-fold" | "check" | "call-any" | null>(null);
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
      label: `${t("min")} (${formatAmount(minimumActionAmount)})`,
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

  // Auto-execute pending action when it's player's turn
  useEffect(() => {
    if (isCurrentPlayerTurn && pendingAction && !isSubmittingAction && !currentPlayer?.hasFolded) {
      const action = pendingAction;
      
      // Execute the pending action based on type
      if (action === "check-fold") {
        // Check/Fold: Check if no one bet, Fold if someone bet
        if (availableActions.some(a => a.type === "check")) {
          setPendingAction(null);
          void runAction({ type: "check", label: "Check" });
        } else {
          setPendingAction(null);
          void runAction({ type: "fold", label: "Fold" });
        }
      } else if (action === "check") {
        // Check: Only check if still available, otherwise cancel
        if (availableActions.some(a => a.type === "check")) {
          setPendingAction(null);
          void runAction({ type: "check", label: "Check" });
        } else {
          // Someone bet, cancel the pre-action
          setPendingAction(null);
          toast.info("มีผู้เล่นเดิมพันเพิ่ม ยกเลิกการผ่านล่วงหน้า");
        }
      } else if (action === "call-any") {
        // Call Any: Always call whatever amount
        const callAction = availableActions.find(a => a.type === "call");
        if (callAction) {
          setPendingAction(null);
          void runAction(callAction);
        } else {
          // If call not available, try to bet instead
          const betAction = availableActions.find(a => a.type === "bet");
          if (betAction) {
            setPendingAction(null);
            void runAction(betAction);
          } else {
            // If neither available, cancel
            setPendingAction(null);
          }
        }
      }
    }
  }, [isCurrentPlayerTurn, pendingAction, isSubmittingAction, currentPlayer?.hasFolded, availableActions]);

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
                if (pendingAction === "check-fold") {
                  setPendingAction(null);
                  toast.info(tActions("check_fold_cancel"));
                } else {
                  setPendingAction("check-fold");
                  toast.info(tActions("check_fold_active"));
                }
              }}
              disabled={isSubmittingAction}
              className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                pendingAction === "check-fold" ? 'border-yellow-500/60 bg-yellow-500/20' : 'border-white/35 bg-white/15'
              }`}
            >
              {tActions("check_fold")}
            </button>

            {/* Check Button */}
            <button
              type="button"
              onClick={() => {
                if (pendingAction === "check") {
                  setPendingAction(null);
                  toast.info(tActions("check_cancel"));
                } else {
                  setPendingAction("check");
                  toast.info(tActions("check_active"));
                }
              }}
              disabled={isSubmittingAction}
              className={`h-9 flex-1 min-w-24 rounded-lg border px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)] disabled:opacity-35 ${
                pendingAction === "check" ? 'border-yellow-500/60 bg-yellow-500/20' : 'border-white/35 bg-white/15'
              }`}
            >
              {tActions("check")}
            </button>

            {/* Call Any Button */}
            <button
              type="button"
              onClick={() => {
                if (pendingAction === "call-any") {
                  setPendingAction(null);
                  toast.info(tActions("call_any_cancel"));
                } else {
                  setPendingAction("call-any");
                  toast.info(tActions("call_any_active"));
                }
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
        {isCurrentPlayerTurn && availableActions.map((action) => (
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
            className="h-9 flex-1 min-w-20 rounded-lg border border-white/35 bg-white/15 px-1 text-xs font-semibold text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.06)]"
          >
            {getActionButtonLabel({
              action,
              betAmount: currentBet,
              maxAmount: maximumActionAmount,
              t: tActions,
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
