import { PlayerAvatar } from "@/features/game/player-avatar";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { CSSProperties } from "react";

export function PlayerSeat({
  player,
  isCurrentUser,
  isSmallBlind,
  isBigBlind,
  isCurrentTurn,
  hasFolded,
  isWaitingForNextHand,
  winStreak,
  isExtinguishing,
  winnerAmount,
  style,
  draggable,
  isSelected,
  isDragTarget,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  player: RoomPlayerListItem;
  isCurrentUser: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  hasFolded?: boolean;
  isWaitingForNextHand?: boolean;
  winStreak?: number;
  isExtinguishing?: boolean;
  winnerAmount?: number;
  style: CSSProperties;
  draggable?: boolean;
  isSelected?: boolean;
  isDragTarget?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const name = player.displayName ?? "Unnamed";
  const isOffline = player.online === false;
  const formattedWinnerAmount =
    winnerAmount === undefined
      ? null
      : `+${winnerAmount.toLocaleString("en-US")}`;
  const seatOpacityClass = isWaitingForNextHand
    ? "opacity-65 grayscale"
    : hasFolded
      ? "opacity-60 grayscale-[0.3]"
      : isOffline
        ? "opacity-45 grayscale"
        : "opacity-100";
  const nameColorClass = isWaitingForNextHand
    ? "text-white/65"
    : hasFolded
      ? "text-red-300/80 line-through"
      : isOffline
        ? "text-white/55"
        : "text-white";
  const title = isWaitingForNextHand
    ? `${name} is waiting for the next hand`
    : draggable
      ? "Drag to rearrange seats or click for summary"
      : `Click to view ${name}'s summary`;

  return (
    <div
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!draggable) {
          return;
        }

        event.preventDefault();
        onDragOver?.();
      }}
      onDrop={(event) => {
        if (!draggable) {
          return;
        }

        event.preventDefault();
        onDrop?.();
      }}
      className={`group absolute w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 select-none ${seatOpacityClass} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={style}
      title={title}
    >
      <div className="relative mx-auto w-fit transition-transform duration-150 group-hover:scale-105">
        <div
          className={
            isSelected || isDragTarget
              ? "rounded-full ring-2 ring-white/80 ring-offset-2 ring-offset-black"
              : undefined
          }
        >
          <PlayerAvatar
            uid={player.uid}
            name={name}
            photoUrl={player.photoUrl}
            winStreak={winStreak}
            isCurrentUser={isCurrentUser}
            isSmallBlind={isSmallBlind && !isWaitingForNextHand}
            isBigBlind={isBigBlind && !isWaitingForNextHand}
            isCurrentTurn={isCurrentTurn && !isWaitingForNextHand}
            hasFolded={hasFolded}
          />
        </div>
        {isWaitingForNextHand ? (
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/85 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.12)]">
            Waiting
          </div>
        ) : null}
        {formattedWinnerAmount ? (
          <div className="chipless-winner-amount pointer-events-none absolute -top-4 -left-3 z-50 text-base font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)] tabular-nums">
            {formattedWinnerAmount}
          </div>
        ) : null}
        {isExtinguishing ? (
          <div
            className="chipless-extinguish-splash pointer-events-none absolute inset-[-0.35rem] z-40 rounded-full"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <p
        className={`mt-1 truncate text-center text-sm leading-tight font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] group-hover:text-white ${nameColorClass}`}
      >
        {name}
      </p>
    </div>
  );
}
