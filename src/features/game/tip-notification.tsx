"use client";

import { useEffect } from "react";

export type TipNotification = {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  amount: number;
  timestamp: number;
};

type TipNotificationAtPlayerProps = {
  notification: TipNotification;
  onComplete: (id: string) => void;
};

export function TipNotificationAtPlayer({
  notification,
  onComplete,
}: TipNotificationAtPlayerProps) {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onComplete(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onComplete]);

  return (
    <div
      className="pointer-events-none absolute -top-12 left-1/2 z-50 -translate-x-1/2 animate-tip-in"
    >
      <div className="relative overflow-hidden rounded-lg border border-emerald-400/60 bg-gradient-to-br from-emerald-950/95 to-emerald-900/95 px-2 py-1.5 shadow-[0_0_16px_rgba(16,185,129,0.4)] backdrop-blur-sm">
        {/* Shine effect */}
        <div className="absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative flex items-center gap-1.5">
          {/* Money icon */}
          <div className="flex size-6 shrink-0 animate-bounce items-center justify-center rounded-full bg-emerald-500/20 text-base">
            💰
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.9)] leading-none">
              +{notification.amount}
            </p>
          </div>

          {/* Floating coins */}
          <div className="absolute -right-1 -top-1 flex gap-0.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="animate-float text-[10px]"
                style={{
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                💸
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-emerald-400/20">
          <div className="h-full w-full animate-progress-bar bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}

// Sender notification (blue card)
type TipNotificationAtSenderProps = {
  notification: TipNotification;
  toName: string;
  onComplete: (id: string) => void;
};

export function TipNotificationAtSender({
  notification,
  toName,
  onComplete,
}: TipNotificationAtSenderProps) {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onComplete(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onComplete]);

  return (
    <div
      className="pointer-events-none absolute -top-12 left-1/2 z-50 -translate-x-1/2 animate-tip-in"
    >
      <div className="relative overflow-hidden rounded-lg border border-blue-400/60 bg-gradient-to-br from-blue-950/95 to-blue-900/95 px-2 py-1.5 shadow-[0_0_16px_rgba(59,130,246,0.4)] backdrop-blur-sm">
        {/* Shine effect */}
        <div className="absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative flex items-center gap-1.5">
          {/* Money icon */}
          <div className="flex size-6 shrink-0 animate-bounce items-center justify-center rounded-full bg-blue-500/20 text-base">
            💸
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-[10px] font-semibold text-white leading-tight whitespace-nowrap">
              You sent to
            </p>
            <p className="text-[10px] font-bold text-white leading-tight whitespace-nowrap">
              {toName}
            </p>
          </div>

          {/* Floating coins */}
          <div className="absolute -right-1 -top-1 flex gap-0.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="animate-float text-[10px]"
                style={{
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                💸
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-400/20">
          <div className="h-full w-full animate-progress-bar bg-blue-400" />
        </div>
      </div>
    </div>
  );
}

// Keep old component for backward compatibility but unused
type TipNotificationDisplayProps = {
  notifications: TipNotification[];
  onComplete: (id: string) => void;
};

export function TipNotificationDisplay({
  notifications,
  onComplete,
}: TipNotificationDisplayProps) {
  return null; // No longer used
}