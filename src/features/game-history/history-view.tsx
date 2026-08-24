"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { History, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeGameHistory } from "./services/subscribe-game-history";
import { HistoryRoomCard } from "./history-room-card";
import type { GameHistoryListItem } from "./services/subscribe-game-history";
import { getFirebaseAuth } from "@/lib/firebase/client";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: GameHistoryListItem[] };

export function HistoryView() {
  const router = useRouter();
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setLoadState({
        status: "error",
        message: "Please sign in to view history.",
      });
      return;
    }

    const unsubscribe = subscribeGameHistory(currentUser.uid, (history) => {
      setLoadState({ status: "ready", history });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  function handleViewDetails(historyKey: string) {
    router.push(`/history/${historyKey}`);
  }

  function handleBackHome() {
    router.push("/");
  }

  if (loadState.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center text-neutral-400">{tCommon("loading")}</div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 text-center text-neutral-400">
          {loadState.message}
        </div>
        <Button
          onClick={handleBackHome}
          variant="outline"
          className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back_to_home")}
        </Button>
      </div>
    );
  }

  if (loadState.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <History className="mb-4 h-12 w-12 text-neutral-600" />
        <div className="mb-2 text-center text-neutral-400">
          {t("no_history")}
        </div>
        <p className="mb-6 text-center text-sm text-neutral-500">
          {t("no_history_description")}
        </p>
        <Button
          onClick={handleBackHome}
          variant="outline"
          className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back_to_home")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          onClick={handleBackHome}
          variant="outline"
          size="sm"
          className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back_to_home")}
        </Button>
      </div>

      <div className="space-y-4">
        {loadState.history.map((historyItem) => (
          <HistoryRoomCard
            key={historyItem.historyKey}
            history={historyItem}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
