import { PlayerAvatar } from "@/features/game/player-avatar";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { CSSProperties } from "react";

export function PlayerSeat({
  player,
  isCurrentUser,
  isBigBlind,
  isCurrentTurn,
  hasFolded,
  winStreak,
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
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  hasFolded?: boolean;
  winStreak?: number;
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
      className={`group absolute w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 select-none ${hasFolded ? "opacity-60 grayscale-[0.3]" : isOffline ? "opacity-45 grayscale" : "opacity-100"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={style}
      title={
        draggable
          ? "Drag to rearrange seats or click for summary"
          : `Click to view ${name}'s summary`
      }
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
            isBigBlind={isBigBlind}
            isCurrentTurn={isCurrentTurn}
            hasFolded={hasFolded}
          />
        </div>
      </div>

      <p
        className={`mt-1 truncate text-center text-sm leading-tight font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] group-hover:text-white ${hasFolded ? "text-red-300/80 line-through" : isOffline ? "text-white/55" : "text-white"}`}
      >
        {name}
      </p>
    </div>
  );
}
