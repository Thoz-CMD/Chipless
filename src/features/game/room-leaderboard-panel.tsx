import { EyeOff, Trophy } from "lucide-react";

import { getRoomLeaderboard } from "@/features/game/logic/room-leaderboard";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

function formatAmount(amount: number): string {
  const absoluteAmount = Math.abs(amount).toLocaleString("en-US");

  if (amount > 0) {
    return `+${absoluteAmount}`;
  }

  if (amount < 0) {
    return `-${absoluteAmount}`;
  }

  return "0";
}

function getRankTextColor(rank: number): string {
  if (rank === 1) {
    return "text-amber-300";
  }

  if (rank === 2) {
    return "text-slate-200";
  }

  if (rank === 3) {
    return "text-orange-300";
  }

  return "text-white/55";
}

export function RoomLeaderboardPanel({
  players,
  settlements,
  currentUid,
  isVisible,
  onToggleVisible,
  onSelectPlayer,
}: {
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  currentUid: string;
  isVisible: boolean;
  onToggleVisible: () => void;
  onSelectPlayer?: (player: RoomPlayerListItem) => void;
}) {
  const rows = getRoomLeaderboard({ settlements, players }).slice(0, 4);

  if (!isVisible) {
    return (
      <div className="relative h-8 w-[148px] sm:w-[166px]">
        <button
          type="button"
          onClick={onToggleVisible}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2 text-[10px] font-bold tracking-wider text-white/60 uppercase backdrop-blur-[2px] transition-colors hover:border-white/25 hover:bg-black/40 hover:text-white"
          aria-label="Show room leaderboard"
        >
          <Trophy className="size-3" aria-hidden="true" />
          Rank
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="relative h-8 w-[148px] sm:w-[166px]">
      <section className="absolute top-0 left-0 z-20 w-[148px] rounded-xl border border-white/10 bg-black/25 p-1.5 text-white shadow-[0_0_14px_rgba(0,0,0,0.18)] backdrop-blur-[2px] sm:w-[166px]">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold tracking-wider text-white/50 uppercase">
            <Trophy className="size-3 text-white/55" aria-hidden="true" />
            <span className="truncate">Leaderboard</span>
          </div>
          <button
            type="button"
            onClick={onToggleVisible}
            className="grid size-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-white/45 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
            aria-label="Hide room leaderboard"
            title="Hide leaderboard"
          >
            <EyeOff className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          {rows.map((row) => {
            const player = players.find(
              (candidate) => candidate.uid === row.uid,
            );
            const isCurrentUser = row.uid === currentUid;
            const canSelect = Boolean(player && onSelectPlayer);

            return (
              <button
                key={row.uid}
                type="button"
                onClick={() => {
                  if (player) {
                    onSelectPlayer?.(player);
                  }
                }}
                disabled={!canSelect}
                className={`grid h-8 w-full grid-cols-[1.25rem_1fr_auto] items-center gap-1.5 rounded-lg border px-1.5 text-left transition-colors disabled:cursor-default ${
                  isCurrentUser
                    ? "border-white/25 bg-white/12"
                    : "border-white/5 bg-black/10 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <span
                  className={`text-[10px] font-bold ${getRankTextColor(row.rank)}`}
                >
                  #{row.rank}
                </span>
                <span className="min-w-0 truncate text-[11px] font-semibold text-white">
                  {row.displayName}
                </span>
                <span
                  className={`text-[11px] font-bold tabular-nums ${
                    row.net > 0
                      ? "text-emerald-300"
                      : row.net < 0
                        ? "text-rose-300"
                        : "text-white/55"
                  }`}
                >
                  {formatAmount(row.net)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
