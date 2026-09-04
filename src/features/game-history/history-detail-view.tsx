"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDatabase, ref, get, remove } from "firebase/database";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import type { GameHistoryData } from "./services/save-game-history";
import { RoomScoreboardDialog } from "@/features/game/room-scoreboard-dialog";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";

const GAME_HISTORY_RETENTION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; history: GameHistoryData };

type HistoryDetailViewProps = {
  historyKey: string;
};

export function HistoryDetailView({ historyKey }: HistoryDetailViewProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();

    async function loadHistoryDetail() {
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

        const db = getDatabase();
        const historyRef = ref(db, `gameHistory/${currentUser.uid}/${historyKey}`);

        const snapshot = await get(historyRef);
        if (!snapshot.exists()) {
          setLoadState({
            status: "error",
            message: "History not found.",
          });
          return;
        }

        const history = snapshot.val() as GameHistoryData;
        
        // Check if history is older than 7 days and delete it
        const now = Date.now();
        const cutoffTime = now - (GAME_HISTORY_RETENTION_DAYS * MS_PER_DAY);
        if (history.endedAt < cutoffTime) {
          await remove(historyRef);
          setLoadState({
            status: "error",
            message: "History has expired.",
          });
          return;
        }
        
        setLoadState({ status: "ready", history });
      } catch (error) {
        setLoadState({
          status: "error",
          message: "Unable to load history.",
        });
      }
    }

    loadHistoryDetail();
  }, [historyKey]);

  function handleCloseScoreboard() {
    setIsScoreboardOpen(false);
    router.push("/history");
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
          onClick={() => router.push("/")}
          variant="outline"
          className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCommon("back_to_home")}
        </Button>
      </div>
    );
  }

  const { history } = loadState;
  const currentUid = getFirebaseAuth().currentUser?.uid ?? "";

  // Convert players to RoomPlayerListItem format
  const players = Object.values(history.players).map((player) => ({
    uid: player.uid,
    displayName: player.displayName,
    photoUrl: player.photoUrl,
    role: player.uid === history.hostUid ? ("host" as const) : ("player" as const),
    isPresent: false,
    isConnected: false,
    online: false,
    joinedAt: 0,
    lastSeen: 0,
  }));

  // Convert settlements to correct format
  const settlements: Record<number, HandSettlement> = Object.fromEntries(
    Object.entries(history.settlements).map(([handNum, settlement]) => [
      Number(handNum),
      settlement as HandSettlement,
    ]),
  );

  return (
    <div>
      <RoomScoreboardDialog
        open={isScoreboardOpen}
        onOpenChange={handleCloseScoreboard}
        players={players}
        settlements={settlements}
        currentUid={currentUid}
        roomId={history.roomId}
        isHost={false}
        isHistoryMode={true}
      />
    </div>
  );
}
