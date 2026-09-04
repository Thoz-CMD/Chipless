"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BG_THEMES,
  CARD_THEMES,
  TABLE_THEMES,
  DEFAULT_BG_ID,
  DEFAULT_TABLE_ID,
  DEFAULT_CARD_ID,
  BG_STORAGE_KEY,
  TABLE_STORAGE_KEY,
  CARD_STORAGE_KEY,
  type BgTheme,
  type BgThemeId,
  type TableTheme,
  type TableThemeId,
  type CardTheme,
  type CardThemeId,
} from "@/features/game/table-skins";

function readStorage<T extends string>(
  key: string,
  valid: Record<T, unknown>,
  fallback: T,
): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored && stored in valid) return stored as T;
  } catch {
    // SSR / private browsing
  }
  return fallback;
}

export function useTableSkin(): {
  bgTheme: BgTheme;
  tableTheme: TableTheme;
  cardTheme: CardTheme;
  bgThemeId: BgThemeId;
  tableThemeId: TableThemeId;
  cardThemeId: CardThemeId;
  setBgThemeId: (id: BgThemeId) => void;
  setTableThemeId: (id: TableThemeId) => void;
  setCardThemeId: (id: CardThemeId) => void;
} {
  const [bgId, setBgId] = useState<BgThemeId>(DEFAULT_BG_ID);
  const [tableId, setTableId] = useState<TableThemeId>(DEFAULT_TABLE_ID);
  const [cardId, setCardId] = useState<CardThemeId>(DEFAULT_CARD_ID);

  // Read from localStorage after mount
  useEffect(() => {
    setBgId(readStorage(BG_STORAGE_KEY, BG_THEMES, DEFAULT_BG_ID));
    setTableId(readStorage(TABLE_STORAGE_KEY, TABLE_THEMES, DEFAULT_TABLE_ID));
    setCardId(readStorage(CARD_STORAGE_KEY, CARD_THEMES, DEFAULT_CARD_ID));
  }, []);

  const setBgThemeId = useCallback((id: BgThemeId) => {
    setBgId(id);
    try { localStorage.setItem(BG_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  const setTableThemeId = useCallback((id: TableThemeId) => {
    setTableId(id);
    try { localStorage.setItem(TABLE_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  const setCardThemeId = useCallback((id: CardThemeId) => {
    setCardId(id);
    try { localStorage.setItem(CARD_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  return {
    bgTheme: BG_THEMES[bgId],
    tableTheme: TABLE_THEMES[tableId],
    cardTheme: CARD_THEMES[cardId],
    bgThemeId: bgId,
    tableThemeId: tableId,
    cardThemeId: cardId,
    setBgThemeId,
    setTableThemeId,
    setCardThemeId,
  };
}
