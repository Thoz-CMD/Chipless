// ─── Background Themes ────────────────────────────────────────────────────────

export type BgThemeId = "black" | "forest" | "ocean" | "crimson" | "violet" | "slate";

export type BgTheme = {
  id: BgThemeId;
  name: string;
  previewColor: string; // solid color for swatch preview
  gradient: string;     // full CSS gradient for room background
};

export const BG_THEMES: Record<BgThemeId, BgTheme> = {
  black: {
    id: "black",
    name: "Black",
    previewColor: "#0a0a0a",
    gradient: "linear-gradient(135deg, #050505 0%, #0d0d0d 100%)",
  },
  forest: {
    id: "forest",
    name: "Forest",
    previewColor: "#0a1a0a",
    gradient: "linear-gradient(135deg, #0a1a0a 0%, #061206 60%, #050d05 100%)",
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    previewColor: "#020614",
    gradient: "linear-gradient(135deg, #020614 0%, #030820 60%, #010510 100%)",
  },
  crimson: {
    id: "crimson",
    name: "Crimson",
    previewColor: "#1a0005",
    gradient: "linear-gradient(135deg, #1a0005 0%, #120003 60%, #0d0002 100%)",
  },
  violet: {
    id: "violet",
    name: "Violet",
    previewColor: "#0d0020",
    gradient: "linear-gradient(135deg, #0d0020 0%, #080015 60%, #050010 100%)",
  },
  slate: {
    id: "slate",
    name: "Slate",
    previewColor: "#0d0d14",
    gradient: "linear-gradient(135deg, #0d0d14 0%, #0a0a10 60%, #070710 100%)",
  },
};

export const DEFAULT_BG_ID: BgThemeId = "black";
export const BG_STORAGE_KEY = "chipless_bg_theme";
export const BG_ORDER: BgThemeId[] = ["black", "forest", "ocean", "crimson", "violet", "slate"];


// ─── Table Themes ─────────────────────────────────────────────────────────────

export type TableThemeId = "classic" | "midnight" | "vegas" | "royal" | "neon" | "charcoal";

export type TableTheme = {
  id: TableThemeId;
  name: string;
  previewColor: string;
  tableOuter: string;
  tableInner: string;
  tableBorder: string;
  tableGlow: string;
  potBg: string;
};

export const TABLE_THEMES: Record<TableThemeId, TableTheme> = {
  classic: {
    id: "classic",
    name: "Classic",
    previewColor: "#1e5a1e",
    tableOuter:
      "radial-gradient(circle at center, rgba(30,90,30,0.92), rgba(5,35,5,0.97) 62%)",
    tableInner: "rgba(20,60,20,0.55)",
    tableBorder: "rgba(120,80,40,0.55)",
    tableGlow:
      "inset 0 0 42px rgba(80,160,80,0.15), 0 0 28px rgba(60,120,60,0.2)",
    potBg: "rgba(0,20,0,0.75)",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    previewColor: "#0a1e50",
    tableOuter:
      "radial-gradient(circle at center, rgba(10,30,80,0.95), rgba(3,8,28,0.98) 62%)",
    tableInner: "rgba(8,20,60,0.55)",
    tableBorder: "rgba(40,60,100,0.6)",
    tableGlow:
      "inset 0 0 42px rgba(40,80,200,0.12), 0 0 28px rgba(30,60,160,0.2)",
    potBg: "rgba(5,10,40,0.82)",
  },
  vegas: {
    id: "vegas",
    name: "Vegas",
    previewColor: "#640a14",
    tableOuter:
      "radial-gradient(circle at center, rgba(100,10,20,0.95), rgba(40,5,8,0.98) 62%)",
    tableInner: "rgba(70,8,14,0.55)",
    tableBorder: "rgba(180,140,0,0.65)",
    tableGlow:
      "inset 0 0 42px rgba(200,40,40,0.15), 0 0 28px rgba(180,140,0,0.25)",
    potBg: "rgba(30,5,8,0.85)",
  },
  royal: {
    id: "royal",
    name: "Royal",
    previewColor: "#32105a",
    tableOuter:
      "radial-gradient(circle at center, rgba(50,10,90,0.95), rgba(18,4,32,0.98) 62%)",
    tableInner: "rgba(35,7,65,0.55)",
    tableBorder: "rgba(200,160,30,0.65)",
    tableGlow:
      "inset 0 0 42px rgba(120,40,200,0.18), 0 0 28px rgba(180,140,0,0.22)",
    potBg: "rgba(20,4,40,0.85)",
  },
  neon: {
    id: "neon",
    name: "Neon",
    previewColor: "#041204",
    tableOuter:
      "radial-gradient(circle at center, rgba(4,18,4,0.98), rgba(0,5,0,0.99) 62%)",
    tableInner: "rgba(0,10,0,0.7)",
    tableBorder: "rgba(0,255,80,0.4)",
    tableGlow:
      "inset 0 0 42px rgba(0,255,80,0.08), 0 0 32px rgba(0,255,80,0.18), 0 0 8px rgba(0,255,80,0.35)",
    potBg: "rgba(0,12,0,0.9)",
  },
  charcoal: {
    id: "charcoal",
    name: "Charcoal",
    previewColor: "#1e1e1e",
    tableOuter:
      "radial-gradient(circle at center, rgba(45,45,45,0.95), rgba(15,15,15,0.98) 62%)",
    tableInner: "rgba(30,30,30,0.55)",
    tableBorder: "rgba(100,100,100,0.45)",
    tableGlow:
      "inset 0 0 42px rgba(150,150,150,0.08), 0 0 28px rgba(120,120,120,0.12)",
    potBg: "rgba(10,10,10,0.85)",
  },
};

export const DEFAULT_TABLE_ID: TableThemeId = "charcoal";
export const TABLE_STORAGE_KEY = "chipless_table_theme";
export const TABLE_ORDER: TableThemeId[] = [
  "charcoal", "classic", "midnight", "vegas", "royal", "neon",
];


// ─── Card Themes ──────────────────────────────────────────────────────────────

export type CardThemeId = "black" | "classic" | "crimson" | "gold" | "emerald" | "neon";

export type CardTheme = {
  id: CardThemeId;
  name: string;
  previewColor: string;
  backBg: string;
  backBorder: string;
  backPattern: string;
  frontBg: string;
  frontText: string;
  frontBorder: string;
};

export const CARD_THEMES: Record<CardThemeId, CardTheme> = {
  black: {
    id: "black",
    name: "Black",
    previewColor: "#0f0f12",
    backBg: "rgb(15,15,18)",
    backBorder: "rgba(255,255,255,0.25)",
    backPattern:
      "repeating-linear-gradient(45deg,rgba(255,255,255,0.07) 0px,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 7px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.07) 0px,rgba(255,255,255,0.07) 1px,transparent 1px,transparent 7px)",
    frontBg: "#ffffff",
    frontText: "#000000",
    frontBorder: "#000000",
  },
  classic: {
    id: "classic",
    name: "Classic",
    previewColor: "#14145a",
    backBg: "rgb(20,20,90)",
    backBorder: "rgba(150,30,30,0.9)",
    backPattern:
      "repeating-linear-gradient(45deg,rgba(150,30,30,0.35) 0px,rgba(150,30,30,0.35) 2px,transparent 2px,transparent 8px)",
    frontBg: "#ffffff",
    frontText: "#000000",
    frontBorder: "#000000",
  },
  crimson: {
    id: "crimson",
    name: "Crimson",
    previewColor: "#50050a",
    backBg: "rgb(80,5,10)",
    backBorder: "rgba(220,50,50,0.85)",
    backPattern:
      "repeating-linear-gradient(45deg,rgba(220,50,50,0.3) 0px,rgba(220,50,50,0.3) 2px,transparent 2px,transparent 8px)",
    frontBg: "#ffffff",
    frontText: "#1a0000",
    frontBorder: "#8B0000",
  },
  gold: {
    id: "gold",
    name: "Gold",
    previewColor: "#2a1e00",
    backBg: "rgb(20,14,0)",
    backBorder: "rgba(200,160,30,0.9)",
    backPattern:
      "repeating-linear-gradient(45deg,rgba(180,140,0,0.2) 0px,rgba(180,140,0,0.2) 2px,transparent 2px,transparent 10px)",
    frontBg: "#ffffff",
    frontText: "#1a0a00",
    frontBorder: "#8B6914",
  },
  emerald: {
    id: "emerald",
    name: "Emerald",
    previewColor: "#003018",
    backBg: "rgb(0,30,15)",
    backBorder: "rgba(0,180,80,0.8)",
    backPattern:
      "repeating-linear-gradient(45deg,rgba(0,160,70,0.25) 0px,rgba(0,160,70,0.25) 2px,transparent 2px,transparent 8px)",
    frontBg: "#ffffff",
    frontText: "#001a00",
    frontBorder: "#006633",
  },
  neon: {
    id: "neon",
    name: "Neon",
    previewColor: "#000800",
    backBg: "rgb(0,8,0)",
    backBorder: "rgba(0,255,80,0.7)",
    backPattern:
      "repeating-linear-gradient(90deg,rgba(0,255,80,0.08) 0px,rgba(0,255,80,0.08) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(0deg,rgba(0,255,80,0.08) 0px,rgba(0,255,80,0.08) 1px,transparent 1px,transparent 8px)",
    frontBg: "#ffffff",
    frontText: "#001a00",
    frontBorder: "#00ff50",
  },
};

export const DEFAULT_CARD_ID: CardThemeId = "black";
export const CARD_STORAGE_KEY = "chipless_card_theme";
export const CARD_ORDER: CardThemeId[] = ["black", "classic", "crimson", "gold", "emerald", "neon"];
