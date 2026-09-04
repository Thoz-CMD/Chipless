"use client";

import { Calendar, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { GameHistoryListItem } from "./services/subscribe-game-history";

type HistoryRoomCardProps = {
  history: GameHistoryListItem;
  currentUid?: string;
  onViewDetails: (historyKey: string) => void;
};

function formatAmount(amount: number): string {
  const absoluteAmount = Math.abs(amount).toLocaleString("en-US");
  if (amount > 0) return `+${absoluteAmount}`;
  if (amount < 0) return `-${absoluteAmount}`;
  return "0";
}

export function HistoryRoomCard({
  history,
  currentUid,
  onViewDetails,
}: HistoryRoomCardProps) {
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  const playersCount = Object.keys(history.players).length;
  const handsCount = history.finalStats.totalHands;

  const userNet = currentUid && history.settlements
    ? Object.values(history.settlements).reduce((total, settlement) => {
        const result = settlement.playerResults?.[currentUid];
        return total + (result?.net ?? 0);
      }, 0)
    : 0;

  const endedDate = new Date(history.endedAt);
  const formattedDate = endedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {history.roomName}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-neutral-400">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Users className="h-4 w-4 text-neutral-500" />
          <span>
            {playersCount} {playersCount === 1 ? "player" : "players"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-300">
          <TrendingUp className="h-4 w-4 text-neutral-500" />
          <span>
            {handsCount} {handsCount === 1 ? "hand" : "hands"}
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded bg-neutral-800 p-2.5 text-sm">
        <span className="text-neutral-400">{t("your_total_net")}:</span>
        <span
          className={`font-bold tabular-nums ${
            userNet > 0
              ? "text-emerald-400"
              : userNet < 0
                ? "text-rose-400"
                : "text-neutral-300"
          }`}
        >
          {formatAmount(userNet)} {tCommon("currency")}
        </span>
      </div>

      <Button
        onClick={() => onViewDetails(history.historyKey)}
        className="w-full bg-white text-black hover:bg-neutral-200"
      >
        {t("view_details")}
      </Button>
    </div>
  );
}
