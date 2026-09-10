// ─── Emoji Reaction Types ─────────────────────────────────────────────────────

export type EmojiType =
  | "👍" // thumbs up
  | "😂" // laugh
  | "😎" // cool
  | "🔥" // fire
  | "💪" // strong
  | "🤔" // thinking
  | "😱" // shocked
  | "🎉" // party
  | "💯" // 100
  | "❤️" // heart
  | "😢" // sad
  | "🤬"; // angry

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

export const EMOJI_LIST: { emoji: EmojiType; label: string }[] = [
  { emoji: "👍", label: "Nice!" },
  { emoji: "😂", label: "LOL" },
  { emoji: "😎", label: "Cool" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🤔", label: "Hmm" },
  { emoji: "😱", label: "OMG" },
  { emoji: "🎉", label: "Yeah!" },
  { emoji: "💯", label: "Perfect" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🤬", label: "Angry" },
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
  switch (emoji) {
    case "🔥":
    case "💯":
      return "pulse";
    case "😂":
    case "😱":
      return "shake";
    case "🎉":
      return "spin";
    default:
      return "bounce";
  }
}
