// ─── Profile Frame Themes ─────────────────────────────────────────────────────

export type ProfileFrameId = "none" | "neon-hex" | "diamond-elite" | "cyber-ring";

export type ProfileFrame = {
  id: ProfileFrameId;
  name: string;
  previewColor: string;
  borderStyle: string;
  glowEffect: string;
  ringStyle?: string;
  cornerAccents?: boolean;
  pulseAnimation?: boolean;
};

export const PROFILE_FRAMES: Record<ProfileFrameId, ProfileFrame> = {
  none: {
    id: "none",
    name: "None",
    previewColor: "#666666",
    borderStyle: "border-white/45",
    glowEffect: "shadow-[0_0_18px_rgba(255,255,255,0.18)]",
  },
  "neon-hex": {
    id: "neon-hex",
    name: "Neon Hex",
    previewColor: "#00ffff",
    borderStyle: "border-2 border-cyan-400",
    glowEffect: "shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(6,182,212,0.4)]",
    ringStyle: "ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-black/80",
    cornerAccents: true,
    pulseAnimation: true,
  },
  "diamond-elite": {
    id: "diamond-elite",
    name: "Diamond Elite",
    previewColor: "#ffd700",
    borderStyle: "border-[3px] border-transparent",
    glowEffect: "shadow-[0_0_24px_rgba(234,179,8,0.9),0_0_48px_rgba(234,179,8,0.5),inset_0_0_20px_rgba(250,204,21,0.3)]",
    ringStyle: "ring-[3px] ring-yellow-400 ring-offset-2 ring-offset-black",
    cornerAccents: true,
    pulseAnimation: false,
  },
  "cyber-ring": {
    id: "cyber-ring",
    name: "Cyber Ring",
    previewColor: "#ff00ff",
    borderStyle: "border-2 border-fuchsia-500",
    glowEffect: "shadow-[0_0_16px_rgba(217,70,239,0.8),0_0_32px_rgba(192,38,211,0.6),0_0_8px_rgba(240,171,252,1)]",
    ringStyle: "ring-2 ring-fuchsia-400/70 ring-offset-[3px] ring-offset-purple-900/50",
    cornerAccents: false,
    pulseAnimation: true,
  },
};

export const DEFAULT_FRAME_ID: ProfileFrameId = "none";
export const FRAME_STORAGE_KEY = "chipless_profile_frame";
export const FRAME_ORDER: ProfileFrameId[] = ["none", "neon-hex", "diamond-elite", "cyber-ring"];
