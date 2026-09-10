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
    let unsubscribeHistory: (() => void) | undefined;
    
    // Use onAuthStateChanged to properly handle authentication state
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      try {
        // Clean up existing subscription
        if (unsubscribeHistory) {
          unsubscribeHistory();
          unsubscribeHistory = undefined;
        }

        if (!user) {
          // Sign in anonymously if not signed in
          await signInWithAnonymousAccount();
          // onAuthStateChanged will be called again with the new user
          return;
        }

        setCurrentUid(user.uid);

        // Now that we're authenticated, subscribe to history
        unsubscribeHistory = subscribeGameHistory(user.uid, (history) => {
          setLoadState({ status: "ready", history });
        });

      } catch (error) {
        console.error("Error in auth state handler:", error);
        setLoadState({
          status: "error",
          message: "Unable to load history.",
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeHistory) {
        unsubscribeHistory();
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
