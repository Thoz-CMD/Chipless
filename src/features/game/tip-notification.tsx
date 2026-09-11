"use client";

import { useEffect } from "react";

export type TipNotification = {
  id: string;
  fromUid: string;
  fromName: string;
  amount: number;
  timestamp: number;
};

type TipNotificationDisplayProps = {
  notifications: TipNotification[];
  onComplete: (id: string) => void;
};

export function TipNotificationDisplay({
  notifications,
  onComplete,
}: TipNotificationDisplayProps) {
  useEffect(() => {
    // Auto-dismiss each notification after 4 seconds
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onComplete(notification.id);
      }, 4000);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="flex flex-col gap-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto animate-tip-in"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="relative overflow-hidden rounded-xl border border-emerald-400/50 bg-gradient-to-br from-emerald-950/95 to-emerald-900/95 px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-sm">
              {/* Shine effect */}
              <div className="absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="relative flex items-center gap-3">
                {/* Money icon */}
                <div className="flex size-10 shrink-0 animate-bounce items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
                  💰
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-white/80">
                    <span className="font-bold text-white">
                      {notification.fromName}
                    </span>
                    {" "}sent you
                  </p>
                  <p className="mt-0.5 text-base font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                    +{notification.amount} THB
                  </p>
                </div>

                {/* Floating coins */}
                <div className="absolute -right-1 -top-1 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="animate-float text-lg"
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
        ))}
      </div>
    </div>
  );
}
