import { ArrowLeft, Circle, Copy, Menu, Trash2 } from "lucide-react";
import NextLink from "next/link";

export function GameHeader({
  roomName,
  playerCount,
  onCopyInviteLink,
  onDeleteRoom,
  isDeletingRoom = false,
  onOpenMenu,
}: {
  roomName: string;
  playerCount: number;
  onCopyInviteLink: () => void;
  onDeleteRoom?: () => void;
  isDeletingRoom?: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <NextLink
            href="/"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/25 bg-black/45 text-white focus:ring-2 focus:ring-white/60 focus:outline-none"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </NextLink>
          <p className="text-base font-bold tracking-normal whitespace-nowrap text-white sm:text-xl">
            Room: {roomName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCopyInviteLink}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-black/45 px-3 text-xs font-semibold text-white focus:ring-2 focus:ring-white/60 focus:outline-none sm:text-sm"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy invite link
          </button>
          {onDeleteRoom ? (
            <button
              type="button"
              onClick={onDeleteRoom}
              disabled={isDeletingRoom}
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-rose-500/35 bg-rose-500/12 text-rose-200 focus:ring-2 focus:ring-rose-200/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={isDeletingRoom ? "Deleting room" : "Delete room"}
              title={isDeletingRoom ? "Deleting room" : "Delete room"}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <div aria-hidden="true" />
        <div className="mx-auto flex items-center gap-3 rounded-lg border border-white/20 bg-black/45 px-4 py-2 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <Circle className="size-3 fill-white" aria-hidden="true" />
            Live
          </span>
          <span>{playerCount} Players</span>
        </div>
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/25 bg-black/45 text-white focus:ring-2 focus:ring-white/60 focus:outline-none"
          aria-label="Open room menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
