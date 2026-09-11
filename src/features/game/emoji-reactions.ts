// ─── Emoji Reaction Types ─────────────────────────────────────────────────────

export type EmojiType = "sticker-1" | "sticker-spam"; // Custom stickers

export type EmojiReaction = {
  id: string;
  emoji: EmojiType;
  fromUid: string;
  fromName: string;
  toUid?: string; // If undefined, shows for all players
  timestamp: number;
  x?: number; // Position override (0-100 percentage)
  y?: number; // Position override (0-100 percentage)
};

export const EMOJI_LIST: { emoji: EmojiType; label: string; image: string; isSpam?: boolean }[] = [
  { 
    emoji: "sticker-1", 
    label: "ส่งเอ็มออนิว", 
    image: "/images/stickers/ส่งเอ็มออนิวไป.png" 
  },
  { 
    emoji: "sticker-spam", 
    label: "ผู้พันเอ็มออนิว (SPAM!)", 
    image: "/images/stickers/ผู้พันเอ็มออนิว.png",
    isSpam: true // Special flag for spam animation
  },
];

// Animation variants for different emoji types
export const EMOJI_ANIMATIONS = {
  bounce: "animate-bounce-float", // Float up with bounce
  shake: "animate-shake-fade", // Shake and fade
  spin: "animate-spin-float", // Spin while floating
  pulse: "animate-pulse-float", // Pulse while floating
} as const;

export type EmojiAnimationType = keyof typeof EMOJI_ANIMATIONS;

// Get animation type based on emoji
export function getEmojiAnimation(emoji: EmojiType): EmojiAnimationType {
  // All stickers use bounce animation
  return "bounce";
}
