"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Globe, Palette } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import {
  BG_ORDER,
  BG_THEMES,
  CARD_ORDER,
  CARD_THEMES,
  TABLE_ORDER,
  TABLE_THEMES,
  type BgTheme,
  type BgThemeId,
  type CardTheme,
  type CardThemeId,
  type TableTheme,
  type TableThemeId,
} from "@/features/game/table-skins";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Sub-page type ─────────────────────────────────────────────────────────────

type Page = "main" | "theme";

// ─── Swatch components ────────────────────────────────────────────────────────

function BgSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: BgTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-200 ${
        isActive
          ? "border-white bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
          : "border-white/15 hover:border-white/40 hover:bg-white/5"
      }`}
    >
      <div className="h-8 w-full rounded-lg" style={{ background: theme.gradient }} />
      <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
        {theme.name}
      </span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
      )}
    </button>
  );
}

function TableSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: TableTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-200 ${
        isActive
          ? "border-white bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
          : "border-white/15 hover:border-white/40 hover:bg-white/5"
      }`}
    >
      <div className="relative flex h-8 w-full items-center justify-center overflow-hidden rounded-lg bg-black/60">
        <div
          className="h-[70%] w-[70%] rounded-full border"
          style={{ background: theme.tableOuter, borderColor: theme.tableBorder, boxShadow: theme.tableGlow }}
        />
      </div>
      <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
        {theme.name}
      </span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
      )}
    </button>
  );
}

function CardSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: CardTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={theme.name}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-200 ${
        isActive
          ? "border-white bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
          : "border-white/15 hover:border-white/40 hover:bg-white/5"
      }`}
    >
      <div className="relative flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-black/40">
        <div
          className="h-6 w-4 rounded border"
          style={{ background: theme.backBg, borderColor: theme.backBorder, backgroundImage: theme.backPattern }}
        />
        <div
          className="flex h-6 w-4 items-center justify-center rounded border text-[8px] font-bold"
          style={{ background: theme.frontBg, color: theme.frontText, borderColor: theme.frontBorder }}
        >
          A
        </div>
      </div>
      <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
        {theme.name}
      </span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
      )}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-white/50">
        {label}
      </span>
    </div>
  );
}

// ─── Row button (for main menu items) ─────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  label,
  description,
  onClick,
  rightSlot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-left transition-all duration-150 ${
        onClick ? "hover:border-white/25 hover:bg-white/8 active:scale-[0.98]" : "cursor-default"
      }`}
    >
      <Icon className="size-4 shrink-0 text-white/60" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-none">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] text-white/45 leading-tight">{description}</p>
        ) : null}
      </div>
      {rightSlot ?? (onClick ? <ChevronRight className="size-4 shrink-0 text-white/35" /> : null)}
    </button>
  );
}

// ─── Language row (inline toggle) ─────────────────────────────────────────────

function LanguageRow() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <SettingsRow
      icon={Globe}
      label="ภาษา / Language"
      description={locale === "th" ? "ไทย" : "English"}
      onClick={toggleLocale}
      rightSlot={
        <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/8 px-2.5 py-1">
          <span className={`text-xs font-bold transition-colors ${locale === "th" ? "text-white" : "text-white/35"}`}>TH</span>
          <span className="text-white/25 text-xs">/</span>
          <span className={`text-xs font-bold transition-colors ${locale === "en" ? "text-white" : "text-white/35"}`}>EN</span>
        </div>
      }
    />
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function MainPage({ onGoTheme }: { onGoTheme: () => void }) {
  const locale = useLocale();
  const isTh = locale === "th";

  return (
    <div className="mt-2 space-y-2">
      <LanguageRow />
      <SettingsRow
        icon={Palette}
        label={isTh ? "ธีม" : "Theme"}
        description={isTh ? "พื้นหลัง, โต๊ะ, ไพ่" : "Background, Table, Cards"}
        onClick={onGoTheme}
      />
    </div>
  );
}

// ─── Theme Page ────────────────────────────────────────────────────────────────

function ThemePage({
  bgThemeId,
  tableThemeId,
  cardThemeId,
  onSelectBg,
  onSelectTable,
  onSelectCard,
}: {
  bgThemeId: BgThemeId;
  tableThemeId: TableThemeId;
  cardThemeId: CardThemeId;
  onSelectBg: (id: BgThemeId) => void;
  onSelectTable: (id: TableThemeId) => void;
  onSelectCard: (id: CardThemeId) => void;
}) {
  const locale = useLocale();
  const isTh = locale === "th";

  return (
    <div className="mt-1 space-y-5">
      {/* Background */}
      <div>
        <SectionLabel label={isTh ? "พื้นหลัง" : "Background"} />
        <div className="grid grid-cols-3 gap-2">
          {BG_ORDER.map((id) => (
            <BgSwatch key={id} theme={BG_THEMES[id]} isActive={bgThemeId === id} onSelect={() => onSelectBg(id)} />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Table */}
      <div>
        <SectionLabel label={isTh ? "โต๊ะ" : "Table"} />
        <div className="grid grid-cols-3 gap-2">
          {TABLE_ORDER.map((id) => (
            <TableSwatch key={id} theme={TABLE_THEMES[id]} isActive={tableThemeId === id} onSelect={() => onSelectTable(id)} />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Cards */}
      <div>
        <SectionLabel label={isTh ? "ไพ่" : "Cards"} />
        <div className="grid grid-cols-3 gap-2">
          {CARD_ORDER.map((id) => (
            <CardSwatch key={id} theme={CARD_THEMES[id]} isActive={cardThemeId === id} onSelect={() => onSelectCard(id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main dialog ───────────────────────────────────────────────────────────────

export function TableSkinDialog({
  open,
  bgThemeId,
  tableThemeId,
  cardThemeId,
  onSelectBg,
  onSelectTable,
  onSelectCard,
  onClose,
}: {
  open: boolean;
  bgThemeId: BgThemeId;
  tableThemeId: TableThemeId;
  cardThemeId: CardThemeId;
  onSelectBg: (id: BgThemeId) => void;
  onSelectTable: (id: TableThemeId) => void;
  onSelectCard: (id: CardThemeId) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState<Page>("main");
  const locale = useLocale();
  const isTh = locale === "th";

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPage("main");
      onClose();
    }
  };

  const title = page === "main" ? (isTh ? "ตั้งค่า" : "Settings") : (isTh ? "ธีม" : "Theme");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-black/95 text-white border-white/20 shadow-[0_0_32px_rgba(255,255,255,0.12)] sm:max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {page !== "main" && (
              <button
                type="button"
                onClick={() => setPage("main")}
                className="flex items-center justify-center rounded-lg p-1 hover:bg-white/10 transition-colors"
                aria-label={isTh ? "ย้อนกลับ" : "Back"}
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        {page === "main" && (
          <MainPage onGoTheme={() => setPage("theme")} />
        )}

        {page === "theme" && (
          <ThemePage
            bgThemeId={bgThemeId}
            tableThemeId={tableThemeId}
            cardThemeId={cardThemeId}
            onSelectBg={onSelectBg}
            onSelectTable={onSelectTable}
            onSelectCard={onSelectCard}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
