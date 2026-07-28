import { PlayerAvatar } from "@/features/game/player-avatar";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { CSSProperties } from "react";

export function PlayerSeat({
  player,
  isCurrentUser,
  isBigBlind,
  isCurrentTurn,
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
      className={`absolute w-28 -translate-x-1/2 -translate-y-1/2 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={style}
    >
      <div className="relative mx-auto w-fit">
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
            isCurrentUser={isCurrentUser}
            isBigBlind={isBigBlind}
            isCurrentTurn={isCurrentTurn}
          />
        </div>
      </div>

      <p className="mt-1 truncate text-center text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
        {name}
      </p>
    </div>
  );
}
