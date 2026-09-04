import { PlayerAvatar } from "@/features/game/player-avatar";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { CSSProperties } from "react";

export function PlayerSeat({
  player,
  isCurrentUser,
  isDealer,
  isCurrentTurn,
  hasFolded,
  isWaitingForNextHand,
  winStreak,
  isExtinguishing,
  winnerAmount,
  lastAction,
  lastActionAmount,
  style,
  seatCoordinates,
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
  isDealer: boolean;
  isCurrentTurn: boolean;
  hasFolded?: boolean;
  isWaitingForNextHand?: boolean;
  winStreak?: number;
  isExtinguishing?: boolean;
  winnerAmount?: number;
  lastAction?: string;
  lastActionAmount?: string;
  style: CSSProperties;
  seatCoordinates?: { x: number; y: number };
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
      ? "opacity-50"
      : isOffline
        ? "opacity-45 grayscale"
        : "opacity-100";
  const nameColorClass = isWaitingForNextHand
    ? "text-white/65"
    : hasFolded
      ? "text-white/70"
      : isOffline
        ? "text-white/55"
        : "text-white";
  const title = isWaitingForNextHand
    ? `${name} is waiting for the next hand`
    : draggable
      ? "Drag to rearrange seats or click for summary"
      : `Click to view ${name}'s summary`;

  // Determine action badge color - matching the image design
  const getActionBadgeStyle = () => {
    if (!lastAction) return null;
    
    // Cyan/Blue for BB, SB blinds
    if (
      lastAction === "Big Blind" ||
      lastAction === "บิ๊กบลายด์" ||
      lastAction === "Small Blind" ||
      lastAction === "สมอลบลายด์" ||
      lastAction === "Post Blind" ||
      lastAction === "โพสต์บลายด์"
    ) {
      return "bg-gradient-to-b from-cyan-400 to-cyan-600 text-black shadow-[0_3px_0_0_rgba(0,100,120,0.8)]";
    }
    
    switch (lastAction) {
      case "Fold":
      case "หมอบ":
        return "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_3px_0_0_rgba(100,0,0,0.8)]";
      case "Check":
      case "ผ่าน":
        return "bg-gradient-to-b from-cyan-400 to-cyan-600 text-black shadow-[0_3px_0_0_rgba(0,100,120,0.8)]";
      case "Call":
      case "ตาม":
        return "bg-gradient-to-b from-green-400 to-green-600 text-black shadow-[0_3px_0_0_rgba(0,80,0,0.8)]";
      case "Bet":
      case "เดิมพัน":
      case "Raise":
      case "เรส":
        return "bg-gradient-to-b from-yellow-400 to-yellow-600 text-black shadow-[0_3px_0_0_rgba(100,80,0,0.8)]";
      case "All In":
      case "ออลอิน":
        return "bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_3px_0_0_rgba(120,80,0,0.8)]";
      default:
        return "bg-gradient-to-b from-gray-400 to-gray-600 text-black shadow-[0_3px_0_0_rgba(40,40,40,0.8)]";
    }
  };

  const actionBadgeStyle = getActionBadgeStyle();

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
      className={`group absolute w-24 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 select-none ${seatOpacityClass} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
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
            isDealer={isDealer && !isWaitingForNextHand}
            isCurrentTurn={isCurrentTurn && !isWaitingForNextHand}
            hasFolded={hasFolded}
          />
        </div>
        {isWaitingForNextHand ? (
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.12)]">
            Waiting
          </div>
        ) : null}

        {formattedWinnerAmount ? (
          <div className="chipless-winner-amount pointer-events-none absolute -top-3 -left-2 z-50 text-sm font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)] tabular-nums">
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
        className={`mt-1 truncate text-center text-xs leading-tight font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] group-hover:text-white ${nameColorClass}`}
      >
        {name}
      </p>

      {lastAction && !isWaitingForNextHand && actionBadgeStyle ? (
        <div
          className={`mx-auto mt-1 flex min-w-[60px] w-fit flex-col items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-bold leading-none ${actionBadgeStyle}`}
          style={{ WebkitTextStroke: '0.5px currentColor' }}
        >
          <div className="whitespace-nowrap text-center uppercase tracking-wide">{lastAction}</div>
          {lastActionAmount ? (
            <div className="whitespace-nowrap text-center text-[9px] font-bold leading-none">{lastActionAmount}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
