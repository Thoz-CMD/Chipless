"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { get, off, onValue, ref } from "firebase/database";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import {
  isHoldemGameState,
  type HoldemGameState,
} from "@/features/game/logic/texas-holdem";
import { GameRoomView } from "@/features/game/game-room-view";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import {
  hasPlaceholderName,
  isRoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { setupPlayerPresence } from "@/features/rooms/services/player-presence";
import { repairRoomAfterPlayerLeaves } from "@/features/rooms/services/repair-room-after-player-leaves";
import {
  subscribeRoomPlayers,
  type RoomPlayerListItem,
} from "@/features/rooms/services/subscribe-room-players";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";

type RoomSummaryData = {
  id: string;
  name: string;
  hostUid: string;
  status: "waiting" | "playing";
  gameState?: {
    currentBigBlindUid?: string;
    handNumber?: number;
    hand?: HoldemGameState;
    settlements?: Record<string, HandSettlement>;
  };
  settings: {
    bigBlind: number;
  };
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; room: RoomSummaryData; currentUid: string };

type PlayersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; players: RoomPlayerListItem[] };

function isRoomSummaryData(value: unknown): value is RoomSummaryData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const room = value as Record<string, unknown>;
  const settings = room.settings as Record<string, unknown> | undefined;
  const gameState = room.gameState as Record<string, unknown> | undefined;

  return (
    typeof room.id === "string" &&
    typeof room.name === "string" &&
    typeof room.hostUid === "string" &&
    (room.status === "waiting" || room.status === "playing") &&
    (gameState === undefined ||
      ((gameState.currentBigBlindUid === undefined ||
        typeof gameState.currentBigBlindUid === "string") &&
        (gameState.handNumber === undefined ||
          typeof gameState.handNumber === "number") &&
        (gameState.hand === undefined || isHoldemGameState(gameState.hand)))) &&
    Boolean(settings) &&
    typeof settings?.bigBlind === "number"
  );
}

export function RoomSummary({ roomId }: { roomId: string }) {
  const router = useRouter();
  const repairedMissingPlayerKeys = useRef(new Set<string>());
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [playersState, setPlayersState] = useState<PlayersState>({
    status: "loading",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      try {
        const auth = getFirebaseAuth();

        if (!auth.currentUser) {
          await signInWithAnonymousAccount();
        }

        const uid = getFirebaseAuth().currentUser?.uid;

        if (!uid) {
          throw new Error("Unable to identify current player.");
        }

        const database = getRealtimeDatabase();
        const [snapshot, playerSnapshot] = await Promise.all([
          get(ref(database, `rooms/${roomId}`)),
          get(ref(database, `roomPlayers/${roomId}/${uid}`)),
        ]);
        const value: unknown = snapshot.val();
        const playerValue: unknown = playerSnapshot.val();

        if (!snapshot.exists() || !isRoomSummaryData(value)) {
          throw new Error("Room not found or data is incomplete.");
        }

        if (
          !playerSnapshot.exists() ||
          !isRoomPlayerRecord(playerValue) ||
          hasPlaceholderName(playerValue)
        ) {
          router.replace(`/room/${roomId}/setup-name`);
          return;
        }

        if (isMounted) {
          setLoadState({ status: "loaded", room: value, currentUid: uid });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load room. Please try again.";

        if (isMounted) {
          setLoadState({ status: "error", message });
        }
      }
    }

    void loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, router]);

  useEffect(() => {
    if (loadState.status !== "loaded") {
      return;
    }

    let isMounted = true;
    let cleanupPresence: (() => void) | undefined;
    const roomRef = ref(getRealtimeDatabase(), `rooms/${roomId}`);

    const unsubscribePlayers = subscribeRoomPlayers(
      roomId,
      (players) => {
        if (isMounted) {
          setPlayersState({ status: "loaded", players });
        }
      },
      (error) => {
        if (isMounted) {
          setPlayersState({ status: "error", message: error.message });
        }
      },
    );

    onValue(
      roomRef,
      (snapshot) => {
        const value: unknown = snapshot.val();

        if (!snapshot.exists() || !isRoomSummaryData(value)) {
          if (isMounted) {
            setLoadState({
              status: "error",
              message: "Room not found or data is incomplete.",
            });
          }
          return;
        }

        if (isMounted) {
          setLoadState((current) =>
            current.status === "loaded"
              ? {
                  status: "loaded",
                  room: value,
                  currentUid: current.currentUid,
                }
              : current,
          );
        }
      },
      (error) => {
        if (isMounted) {
          setLoadState({ status: "error", message: error.message });
        }
      },
    );

    setupPlayerPresence(roomId)
      .then((cleanup) => {
        cleanupPresence = cleanup;
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update player presence.";
        toast.error(message);
      });

    return () => {
      isMounted = false;
      off(roomRef);
      unsubscribePlayers();
      cleanupPresence?.();
    };
  }, [loadState.status, roomId]);

  useEffect(() => {
    if (loadState.status !== "loaded" || playersState.status !== "loaded") {
      return;
    }

    const playerUids = new Set(playersState.players.map((player) => player.uid));
    const staleHostUid = playerUids.has(loadState.room.hostUid)
      ? null
      : loadState.room.hostUid;
    const currentBigBlindUid = loadState.room.gameState?.currentBigBlindUid;
    const staleBigBlindUid =
      currentBigBlindUid && !playerUids.has(currentBigBlindUid)
        ? currentBigBlindUid
        : null;
    const staleUid = staleHostUid ?? staleBigBlindUid;

    if (!staleUid || !playerUids.has(loadState.currentUid)) {
      return;
    }

    const repairKey = `${roomId}:${staleUid}`;

    if (repairedMissingPlayerKeys.current.has(repairKey)) {
      return;
    }

    repairedMissingPlayerKeys.current.add(repairKey);
    void repairRoomAfterPlayerLeaves({ roomId, leavingUid: staleUid }).catch(
      () => {
        repairedMissingPlayerKeys.current.delete(repairKey);
      },
    );
  }, [loadState, playersState, roomId]);

  return (
    <section>
      {loadState.status === "loading" ? (
        <div className="rounded-2xl border border-white/45 bg-black/55 p-5 text-center text-sm text-white/65 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
          Loading room...
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="space-y-5 rounded-2xl border border-white/45 bg-black/55 p-5 text-center shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
          <p className="text-sm text-red-200">{loadState.message}</p>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
          >
            <NextLink href="/">
              <ArrowLeft className="size-5" aria-hidden="true" />
              Back Home
            </NextLink>
          </Button>
        </div>
      ) : null}

      {loadState.status === "loaded" && playersState.status === "loading" ? (
        <div className="rounded-2xl border border-white/45 bg-black/55 p-5 text-center text-sm text-white/65 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
          Loading players...
        </div>
      ) : null}

      {loadState.status === "loaded" && playersState.status === "error" ? (
        <div className="space-y-5 rounded-2xl border border-white/45 bg-black/55 p-5 text-center shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
          <p className="text-sm text-red-200">{playersState.message}</p>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
          >
            <NextLink href="/">
              <ArrowLeft className="size-5" aria-hidden="true" />
              Back Home
            </NextLink>
          </Button>
        </div>
      ) : null}

      {loadState.status === "loaded" && playersState.status === "loaded" ? (
        <GameRoomView
          room={loadState.room}
          players={playersState.players}
          currentUid={loadState.currentUid}
        />
      ) : null}
    </section>
  );
}
