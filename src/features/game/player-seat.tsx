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
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
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
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
  onTouchCancel?: (event: React.TouchEvent) => void;
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
        ? "opacity-40 grayscale"
        : "";

  const nameColorClass = isWaitingForNextHand
    ? "text-white/65"
    : hasFolded
      ? "text-white/70"
      : isOffline
        ? "text-white/55"
        : "text-white";

  const title = isOffline
    ? "Offline player"
    : isWaitingForNextHand
      ? "Joined while hand in progress"
      : draggable
        ? "Drag to rearrange seats or click for summary"
        : undefined;

  const isBB = lastAction === "บิ๊กบลายด์" || lastAction === "Big Blind";
  const isSB = lastAction === "สมอลบลายด์" || lastAction === "Small Blind";
  const isFold = lastAction === "หมอบ" || lastAction === "Fold";
  const isCheck = lastAction === "ผ่าน" || lastAction === "Check";
  const isCall = lastAction === "ตาม" || lastAction === "Call";
  const isBet = lastAction === "เดิมพัน" || lastAction === "Bet";
  const isRaise = lastAction === "เรส" || lastAction === "Raise";
  const isAllIn = lastAction === "ออลอิน" || lastAction === "All-In";

  const getActionBadgeStyle = () => {
    if (isFold) {
      return "bg-gradient-to-b from-red-400 to-red-600 text-white shadow-[0_3px_0_0_rgba(150,0,0,0.8)]";
    }
    if (isCheck) {
      return "bg-gradient-to-b from-gray-200 to-gray-400 text-black shadow-[0_3px_0_0_rgba(100,100,100,0.8)]";
    }
    if (isCall) {
      return "bg-gradient-to-b from-emerald-300 to-emerald-500 text-black shadow-[0_3px_0_0_rgba(0,120,60,0.8)]";
    }
    if (isBet || isRaise) {
      return "bg-gradient-to-b from-sky-300 to-sky-500 text-black shadow-[0_3px_0_0_rgba(0,100,180,0.8)]";
    }
    if (isAllIn) {
      return "bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_3px_0_0_rgba(180,100,0,0.8)]";
    }
    if (isBB || isSB) {
      return "bg-gradient-to-b from-cyan-300 to-cyan-500 text-black shadow-[0_3px_0_0_rgba(0,140,160,0.8)]";
    }
    return "bg-gradient-to-b from-gray-400 to-gray-600 text-black shadow-[0_3px_0_0_rgba(40,40,40,0.8)]";
  };

  const actionBadgeStyle = getActionBadgeStyle();

  return (
    <div
      data-player-uid={player.uid}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
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
      className={`group absolute w-24 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 select-none ${seatOpacityClass} ${draggable ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
      style={style}
      title={title}
    >
      <div className={`relative mx-auto w-fit transition-transform duration-150 ${isSelected ? "scale-110" : "group-hover:scale-105"}`}>
        <div
          className={
            isSelected
              ? "rounded-full ring-2 ring-amber-400/90 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-pulse"
              : isDragTarget
                ? "rounded-full ring-2 ring-sky-400/90 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(14,165,233,0.7)] scale-105"
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
