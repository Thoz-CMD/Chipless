"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JoinRoomDialog } from "@/features/rooms/join-room-dialog";
import {
  getWaitingRoomById,
  ListRoomsError,
  subscribeToWaitingRooms,
  type WaitingRoomListItem,
} from "@/features/rooms/services/list-rooms";

type RoomListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; rooms: WaitingRoomListItem[] };

export function JoinRoomList({ initialRoomId }: { initialRoomId?: string }) {
  const [listState, setListState] = useState<RoomListState>({
    status: "loading",
  });
  const [selectedRoom, setSelectedRoom] = useState<WaitingRoomListItem | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const handledInitialRoomId = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    subscribeToWaitingRooms(
      (rooms) => {
        if (isMounted) {
          setListState({ status: "loaded", rooms });
        }
      },
      (error) => {
        const message =
          error instanceof ListRoomsError && error.code === "PERMISSION_DENIED"
            ? "Firebase permission denied"
            : error.message;

        if (isMounted) {
          setListState({ status: "error", message });
        }

        toast.error(message);
      },
    )
      .then((unsubscribeRooms) => {
        unsubscribe = unsubscribeRooms;
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load rooms. Please try again.";

        if (isMounted) {
          setListState({ status: "error", message });
        }

        toast.error(message);
      });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (handledInitialRoomId.current || !initialRoomId) {
      return;
    }

    handledInitialRoomId.current = true;
    let isMounted = true;

    getWaitingRoomById(initialRoomId)
      .then((room) => {
        if (!isMounted) {
          return;
        }

        if (!room) {
          toast.error("Room not found or no longer available.");
          return;
        }

        if (room.status !== "waiting") {
          toast.info("Game already started.");
          return;
        }

        setSelectedRoom(room);
        setDialogOpen(true);
      })
      .catch((error) => {
        const message =
          error instanceof ListRoomsError && error.code === "PERMISSION_DENIED"
            ? "Firebase permission denied"
            : error instanceof Error
              ? error.message
              : "Unable to load room. Please try again.";

        if (isMounted) {
          toast.error(message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialRoomId]);

  function refreshRooms() {
    setListState({ status: "loading" });
    setReloadKey((value) => value + 1);
  }

  function selectRoom(room: WaitingRoomListItem) {
    if (room.status === "playing") {
      return;
    }

    setSelectedRoom(room);
    setDialogOpen(true);
  }

  return (
    <>
      <section className="rounded-2xl border border-white/45 bg-black/55 p-5 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
        {listState.status === "loading" ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-lg border border-white/20 bg-white/10"
              />
            ))}
          </div>
        ) : null}

        {listState.status === "error" ? (
          <div className="space-y-5 text-center">
            <p className="text-sm text-red-200">{listState.message}</p>
            <Button
              type="button"
              onClick={refreshRooms}
              className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
            >
              <RefreshCw className="size-5" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        ) : null}

        {listState.status === "loaded" && listState.rooms.length === 0 ? (
          <div className="space-y-5 text-center">
            <p className="text-sm text-white/65">No rooms available</p>
            <Button
              type="button"
              onClick={refreshRooms}
              className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
            >
              <RefreshCw className="size-5" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        ) : null}

        {listState.status === "loaded" && listState.rooms.length > 0 ? (
          <div className="space-y-3">
            {listState.rooms.map((room) => (
              <article
                key={room.id}
                className="rounded-lg border border-white/25 bg-black/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-white">
                      {room.name}
                    </h3>
                    <p className="mt-1 text-xs tracking-[0.18em] text-white/45 uppercase">
                      {room.id}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-md border border-white/20 px-2 py-1 text-sm font-semibold text-white">
                    {room.bigBlind} THB
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-white/60">
                    <UsersRound className="size-4" aria-hidden="true" />
                    {room.playerCount} player{room.playerCount === 1 ? "" : "s"}
                  </p>
                  {room.status !== "playing" ? (
                    <Button
                      type="button"
                      onClick={() => selectRoom(room)}
                      className="h-10 rounded-lg border border-white bg-white px-4 font-bold text-black hover:bg-neutral-100"
                    >
                      Join Room
                    </Button>
                  ) : (
                    <div className="flex h-10 items-center rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-bold text-white/65">
                      Game started
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <JoinRoomDialog
        room={selectedRoom}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
