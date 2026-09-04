"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { subscribeGameHistory } from "./services/subscribe-game-history";
import { HistoryRoomCard } from "./history-room-card";
import type { GameHistoryListItem } from "./services/subscribe-game-history";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: GameHistoryListItem[] };

export function HistoryView() {
  const router = useRouter();
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    
    async function loadHistory() {
      try {
        // Sign in anonymously if not already signed in
        let currentUser = auth.currentUser;
        if (!currentUser) {
          await signInWithAnonymousAccount();
          currentUser = auth.currentUser;
        }

        if (!currentUser) {
          setLoadState({
            status: "error",
            message: "Unable to authenticate.",
          });
          return;
        }

        setCurrentUid(currentUser.uid);

        const unsubscribe = subscribeGameHistory(currentUser.uid, (history) => {
          setLoadState({ status: "ready", history });
        });

        return unsubscribe;
      } catch (error) {
        setLoadState({
          status: "error",
          message: "Unable to load history.",
        });
      }
    }

    let unsubscribe: (() => void) | undefined;
    
    loadHistory().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  function handleViewDetails(historyKey: string) {
    router.push(`/history/${historyKey}`);
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
        <div className="text-center text-neutral-400">
          {loadState.message}
        </div>
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
        <p className="text-center text-sm text-neutral-500">
          {t("no_history_description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadState.history.map((historyItem) => (
        <HistoryRoomCard
          key={historyItem.historyKey}
          history={historyItem}
          currentUid={currentUid ?? undefined}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
}
