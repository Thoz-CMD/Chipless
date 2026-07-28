"use client";

import { useState } from "react";
import { toast } from "sonner";

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
  const [selectedWinnerUid, setSelectedWinnerUid] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSettleHand(winnerUid: string): Promise<void> {
    if (!winnerUid || isSubmitting) {
      return;
    }

    setSelectedWinnerUid(winnerUid);
    setIsSubmitting(true);

    try {
      await settleHand({ roomId, winnerUid });
      toast.success("Hand settled.");
    } catch (error) {
      const message =
        error instanceof SettleHandError || error instanceof Error
          ? error.message
          : "Unable to settle hand.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Choose Winner</DialogTitle>
          <DialogDescription className="text-white/60">
            Hand #{handNumber}. Select the player who wins this pot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {hand.players.map((player) => (
            <button
              key={player.uid}
              type="button"
              onClick={() => {
                void handleSettleHand(player.uid);
              }}
              disabled={isSubmitting}
              className={`flex h-12 w-full items-center justify-between rounded-lg border px-3 text-left ${
                selectedWinnerUid === player.uid
                  ? "border-white bg-white text-black"
                  : "border-white/20 bg-white/5 text-white"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <span className="font-semibold">{player.displayName}</span>
              <span className="text-sm opacity-70">
                {isSubmitting && selectedWinnerUid === player.uid
                  ? "Saving..."
                  : `Bet ${player.totalContribution.toLocaleString("en-US")} THB`}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
