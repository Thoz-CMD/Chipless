import { ArrowLeft, Copy, Menu, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function GameHeader({
  roomName,
  onCopyInviteLink,
  onDeleteRoom,
  isDeletingRoom = false,
  onLeaveRoom,
  isLeavingRoom = false,
  onOpenMenu,
  leaderboard,
}: {
  roomName: string;
  onCopyInviteLink: () => void;
  onDeleteRoom?: () => void;
  isDeletingRoom?: boolean;
  onLeaveRoom?: () => void;
  isLeavingRoom?: boolean;
  onOpenMenu: () => void;
  leaderboard?: ReactNode;
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {onLeaveRoom ? (
            <button
              type="button"
              onClick={onLeaveRoom}
              disabled={isLeavingRoom}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/25 bg-black/45 text-white focus:ring-2 focus:ring-white/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={isLeavingRoom ? "Leaving room" : "Leave room"}
              title={isLeavingRoom ? "Leaving room" : "Leave room"}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          ) : null}
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

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{leaderboard}</div>
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/25 bg-black/45 text-white focus:ring-2 focus:ring-white/60 focus:outline-none"
          aria-label="Open room menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
