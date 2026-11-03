import { PlayerAvatar } from "@/features/game/player-avatar";
import { PlayingCardFace } from "@/features/game/playing-card-face";
import { HandCategoryLabel } from "@/features/game/hand-category-label";
import type { HandCategory } from "@/features/game/logic/hand-evaluator";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import type { CSSProperties } from "react";
import type { TipNotification } from "@/features/game/tip-notification";
import {
  TipNotificationAtPlayer,
  TipNotificationAtSender,
} from "@/features/game/tip-notification";

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
  privateCards,
  handCategory,
  hideAvatarBadges = false,
  style,
  seatCoordinates,
  isSelected,
  isArrangingSeats,
  isDragTarget,
  onClick,
  tipNotification,
  senderTipNotification,
  onTipNotificationComplete,
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
  privateCards?: readonly string[];
  handCategory?: HandCategory;
  hideAvatarBadges?: boolean;
  rank?: number;
  style: CSSProperties;
  seatCoordinates?: { x: number; y: number };
  isSelected?: boolean;
  isArrangingSeats?: boolean;
  isDragTarget?: boolean;
  onClick?: () => void;
  tipNotification?: TipNotification | null;
  senderTipNotification?: {
    notification: TipNotification;
    toName: string;
  } | null;
  onTipNotificationComplete?: (id: string) => void;
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
      : `Click to view ${name}'s summary`;

  const isBB = lastAction === "เธเธดเนเธเธเธฅเธฒเธขเธ”เน" || lastAction === "Big Blind";
  const isSB = lastAction === "เธชเธกเธญเธฅเธเธฅเธฒเธขเธ”เน" || lastAction === "Small Blind";
  const isFold = lastAction === "เธซเธกเธญเธ" || lastAction === "Fold";
  const isCheck = lastAction === "เธเนเธฒเธ" || lastAction === "Check";
  const isCall = lastAction === "เธ•เธฒเธก" || lastAction === "Call";
  const isBet = lastAction === "เน€เธ”เธดเธกเธเธฑเธ" || lastAction === "Bet";
  const isRaise = lastAction === "เน€เธฃเธช" || lastAction === "Raise";
  const isAllIn = lastAction === "เธญเธญเธฅเธญเธดเธ" || lastAction === "All-In";

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
      onClick={onClick}
      className={`group absolute w-24 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation transition-all duration-200 select-none ${seatOpacityClass}`}
      style={style}
      title={title}
    >
      <div
        className={`relative mx-auto w-fit transition-transform duration-150 ${isSelected ? "scale-110" : isArrangingSeats ? "hover:scale-105" : "group-hover:scale-105"}`}
      >
        {privateCards && privateCards.length > 0 ? (
          <div className="pointer-events-none absolute -top-8 left-1/2 z-10 h-11 w-[3.375rem] -translate-x-1/2">
            {handCategory ? (
              <HandCategoryLabel category={handCategory} className="-top-8 left-1/2 -translate-x-1/2" />
            ) : null}
            {privateCards.map((card, index) => (
              <div key={card} className={`absolute top-0 ${index === 0 ? "left-0 -rotate-6" : "right-0 rotate-6"}`}>
                <PlayingCardFace card={card} showdown />
              </div>
            ))}
          </div>
        ) : null}
        <div
            className={`relative z-20 ${
              isSelected
                ? "animate-pulse rounded-full shadow-[0_0_24px_rgba(245,158,11,0.95)] ring-4 ring-amber-400 ring-offset-2 ring-offset-black"
                : isArrangingSeats
                  ? "rounded-full shadow-[0_0_16px_rgba(56,189,248,0.75)] ring-2 ring-sky-400 ring-offset-2 ring-offset-black transition-all hover:ring-sky-300"
                  : isDragTarget
                    ? "scale-105 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.7)] ring-2 ring-sky-400/90 ring-offset-2 ring-offset-black"
                  : ""
            }`}
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
              sizeClassName="size-11 sm:size-12"
              hideBadges={hideAvatarBadges}
            />
          </div>

        {isWaitingForNextHand ? (
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.12)]">
            Waiting
          </div>
        ) : null}

        {formattedWinnerAmount ? (
          <div className="chipless-winner-amount pointer-events-none absolute -top-3 -left-2 z-50 text-sm font-black text-emerald-300 tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.95)]">
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
          className={`mx-auto mt-1 flex w-fit min-w-[60px] flex-col items-center justify-center rounded-full px-2 py-0.5 text-[9px] leading-none font-bold ${actionBadgeStyle}`}
          style={{ WebkitTextStroke: "0.5px currentColor" }}
        >
          <div className="text-center tracking-wide whitespace-nowrap uppercase">
            {lastAction}
          </div>
          {lastActionAmount ? (
            <div className="text-center text-[9px] leading-none font-bold whitespace-nowrap">
              {lastActionAmount}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Tip notification at player avatar */}
      {tipNotification && onTipNotificationComplete ? (
        <TipNotificationAtPlayer
          notification={tipNotification}
          onComplete={onTipNotificationComplete}
        />
      ) : null}

      {/* Sender tip notification (blue card) */}
      {senderTipNotification && onTipNotificationComplete ? (
        <TipNotificationAtSender
          notification={senderTipNotification.notification}
          toName={senderTipNotification.toName}
          onComplete={onTipNotificationComplete}
        />
      ) : null}
    </div>
  );
}
