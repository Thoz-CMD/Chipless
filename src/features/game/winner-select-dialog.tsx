"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HoldemGameState } from "@/features/game/logic/texas-holdem";
import {
  settleHand,
  SettleHandError,
} from "@/features/rooms/services/settle-hand";

export function WinnerSelectDialog({
  roomId,
  handNumber,
  hand,
  open,
}: {
  roomId: string;
  handNumber: number;
  hand: HoldemGameState;
  open: boolean;
}) {
  const t = useTranslations("winner_dialog");
  const tCommon = useTranslations("common");
  const tGame = useTranslations("game");
  const [selectedWinnerUids, setSelectedWinnerUids] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleWinner(uid: string): void {
    const targetPlayer = hand.players.find((player) => player.uid === uid);

    if (targetPlayer?.hasFolded) {
      return;
    }

    setSelectedWinnerUids((current) => {
      const next = new Set(current);

      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }

      return next;
    });
  }

  async function handleSettleHand(): Promise<void> {
    const winnerUids = Array.from(selectedWinnerUids);

    if (winnerUids.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await settleHand({ roomId, winnerUids });
      toast.success(t("hand_settled"));
      setSelectedWinnerUids(new Set());
    } catch (error) {
      const message =
        error instanceof SettleHandError || error instanceof Error
          ? error.message
          : t("settle_error");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t("description", { handNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {hand.players.map((player) => {
            const isSelected = selectedWinnerUids.has(player.uid);
            const isFolded = player.hasFolded;

            return (
              <button
                key={player.uid}
                type="button"
                onClick={() => toggleWinner(player.uid)}
                disabled={isSubmitting || isFolded}
                className={`flex h-12 w-full items-center justify-between rounded-xl border px-3 text-left text-white transition-colors active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isFolded
                    ? "border-red-300/20 bg-red-950/20"
                    : isSelected
                    ? "border-emerald-300/70 bg-emerald-300/15"
                    : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                }`}
              >
                <span className="font-semibold text-white">
                  {player.displayName}
                </span>
                <span className="text-sm text-white/65">
                  {isFolded
                    ? tGame("folded")
                    : isSelected
                      ? t("selected")
                      : `${t("bet")} ${player.totalContribution.toLocaleString("en-US")} ${tCommon("currency")}`}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              void handleSettleHand();
            }}
            disabled={selectedWinnerUids.size === 0 || isSubmitting}
            className="h-12 w-full rounded-xl border border-white bg-white text-sm font-bold text-black transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting
              ? tCommon("saving")
              : selectedWinnerUids.size > 1
                ? t("settle_split_pot", { count: selectedWinnerUids.size })
                : selectedWinnerUids.size === 1
                  ? t("settle_hand")
                  : t("select_winner")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
