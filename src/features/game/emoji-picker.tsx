"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EmojiType } from "@/features/game/emoji-reactions";
import { EMOJI_LIST } from "@/features/game/emoji-reactions";

export function EmojiPicker({
  onSelectEmoji,
  disabled = false,
}: {
  onSelectEmoji: (emoji: EmojiType) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("emoji");

  const handleEmojiClick = (emoji: EmojiType) => {
    onSelectEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Emoji Picker Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xl backdrop-blur-sm transition-all hover:scale-110 hover:border-white/40 hover:bg-black/80 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        title={t("send_reaction")}
      >
        😀
      </button>

      {/* Emoji Picker Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Emoji Grid - Opens downward */}
          <div className="absolute top-full right-0 z-50 mt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="min-w-[220px] rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900/95 to-black/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-md">
              {/* Arrow pointer - points up to button */}
              <div className="absolute -top-2 right-3 size-4 rotate-45 border-l border-t border-white/20 bg-gradient-to-br from-gray-900/95 to-black/95" />
              
              {/* Emoji Grid */}
              <div className="relative grid grid-cols-4 gap-3">
                {EMOJI_LIST.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="group flex size-12 items-center justify-center rounded-lg border border-transparent text-2xl transition-all hover:scale-125 hover:border-white/30 hover:bg-white/10 active:scale-110"
                    title={label}
                  >
                    <span className="transition-transform group-hover:scale-110">
                      {emoji}
                    </span>
                  </button>
                ))}
              </div>

              {/* Hint text */}
              <p className="mt-3 text-center text-[10px] font-semibold text-white/50">
                {t("choose_emoji")}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
