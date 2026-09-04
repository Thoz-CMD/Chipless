import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Globe,
  Palette,
  Zap,
  Check,
  ArrowLeftRight,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateRoomSettings,
  UpdateRoomSettingsError,
} from "@/features/rooms/services/update-room-settings";
import {
  updatePlayerSeatOrder,
  UpdatePlayerSeatsError,
} from "@/features/rooms/services/update-player-seats";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";
import { cn } from "@/lib/utils";

// ─── Sub-page type ─────────────────────────────────────────────────────────────

type Page = "main" | "theme" | "seats";

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

// ─── Host Room Settings Section ──────────────────────────────────────────────

function HostRoomSettingsSection({
  roomId,
  isHost,
  allInMode = false,
  maxAllInAmount = 50,
}: {
  roomId?: string;
  isHost?: boolean;
  allInMode?: boolean;
  maxAllInAmount?: number;
}) {
  const t = useTranslations("room_settings");
  const [localAllInMode, setLocalAllInMode] = useState(allInMode);
  const [localAmount, setLocalAmount] = useState<number | string>(maxAllInAmount ?? 50);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalAllInMode(allInMode);
    setLocalAmount(maxAllInAmount ?? 50);
  }, [allInMode, maxAllInAmount]);

  if (!roomId) return null;

  const presets = [10, 20, 50, 100];

  const handleToggle = async (nextState: boolean) => {
    if (!isHost || isSaving) return;
    setLocalAllInMode(nextState);
    setIsSaving(true);
    try {
      const parsedAmount = typeof localAmount === "number" ? localAmount : Number(localAmount) || 50;
      await updateRoomSettings(roomId, {
        allInMode: nextState,
        maxAllInAmount: nextState ? parsedAmount : null,
      });
      toast.success(t("settings_saved"));
    } catch {
      toast.error(t("settings_save_error"));
      setLocalAllInMode(allInMode);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAmount = async (amount: number) => {
    if (!isHost || isSaving) return;
    setLocalAmount(amount);
    setIsSaving(true);
    try {
      await updateRoomSettings(roomId, {
        allInMode: true,
        maxAllInAmount: amount,
      });
      toast.success(t("settings_saved"));
    } catch {
      toast.error(t("settings_save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isHost) {
    if (!allInMode) return null;
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
        <div className="flex items-center gap-1.5 font-semibold">
          <Zap className="size-4 text-amber-400" />
          <span>{t("all_in_mode")}: {t("mode_active")} (฿{maxAllInAmount})</span>
        </div>
        <p className="mt-1 text-white/50">{t("all_in_mode_description")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn("size-4", localAllInMode ? "text-amber-400" : "text-white/60")} />
          <div>
            <p className="text-sm font-semibold text-white leading-none">{t("all_in_mode")}</p>
            <p className="mt-0.5 text-[11px] text-white/45">{t("all_in_mode_description")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!localAllInMode)}
          disabled={isSaving}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
            localAllInMode ? "bg-amber-500" : "bg-white/20",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 block size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              localAllInMode ? "left-5" : "left-0.5",
            )}
          />
        </button>
      </div>

      {localAllInMode && (
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">{t("max_all_in_amount")}</span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-amber-400/80">
                ฿
              </span>
              <Input
                type="number"
                min={1}
                step={1}
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => {
                  const num = Number(localAmount);
                  if (num > 0) {
                    void handleSaveAmount(num);
                  }
                }}
                className="h-10 border-amber-500/40 bg-amber-950/30 pl-8 text-right text-sm text-white placeholder:text-white/30 focus-visible:ring-amber-500/40"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const num = Number(localAmount);
                if (num > 0) {
                  void handleSaveAmount(num);
                }
              }}
              disabled={isSaving || !localAmount || Number(localAmount) <= 0}
              className="h-10 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-3"
            >
              {t("save_settings")}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSaveAmount(val)}
                className={cn(
                  "h-8 rounded-lg border text-xs font-semibold transition-colors",
                  Number(localAmount) === val
                    ? "border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    : "border-white/15 bg-black/35 text-white/70 hover:border-white/40 hover:bg-white/10",
                )}
              >
                ฿{val}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function MainPage({
  onGoTheme,
  onGoSeats,
  roomId,
  isHost,
  canArrangeSeats,
  allInMode,
  maxAllInAmount,
}: {
  onGoTheme: () => void;
  onGoSeats?: () => void;
  roomId?: string;
  isHost?: boolean;
  canArrangeSeats?: boolean;
  allInMode?: boolean;
  maxAllInAmount?: number;
}) {
  const locale = useLocale();
  const isTh = locale === "th";
  const t = useTranslations("room_settings");

  return (
    <div className="mt-2 space-y-3">
      <LanguageRow />
      <SettingsRow
        icon={Palette}
        label={isTh ? "ธีม" : "Theme"}
        description={isTh ? "พื้นหลัง, โต๊ะ, ไพ่" : "Background, Table, Cards"}
        onClick={onGoTheme}
      />
      {isHost && canArrangeSeats && onGoSeats && (
        <SettingsRow
          icon={ArrowLeftRight}
          label={t("arrange_seats")}
          description={t("arrange_seats_description")}
          onClick={onGoSeats}
        />
      )}
      <HostRoomSettingsSection
        roomId={roomId}
        isHost={isHost}
        allInMode={allInMode}
        maxAllInAmount={maxAllInAmount}
      />
    </div>
  );
}

// ─── Seats Page ────────────────────────────────────────────────────────────────

function SeatsPage({
  roomId,
  players,
  onStartTableRearrange,
}: {
  roomId?: string;
  players?: RoomPlayerListItem[];
  onStartTableRearrange?: () => void;
}) {
  const t = useTranslations("room_settings");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!roomId || !players || players.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-white/50">
        ต้องมีผู้เล่นอย่างน้อย 2 คนเพื่อจัดตำแหน่ง
      </div>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));

  const handleSwap = async (uidA: string, uidB: string) => {
    if (uidA === uidB || isUpdating) return;
    setIsUpdating(true);
    const fromIndex = sortedPlayers.findIndex((p) => p.uid === uidA);
    const toIndex = sortedPlayers.findIndex((p) => p.uid === uidB);
    if (fromIndex < 0 || toIndex < 0) {
      setIsUpdating(false);
      return;
    }

    const nextPlayers = [...sortedPlayers];
    const [moved] = nextPlayers.splice(fromIndex, 1);
    nextPlayers.splice(toIndex, 0, moved);

    try {
      await updatePlayerSeatOrder(
        roomId,
        nextPlayers.map((p) => p.uid),
      );
      toast.success(t("settings_saved"));
    } catch {
      toast.error(t("settings_save_error"));
    } finally {
      setIsUpdating(false);
      setSelectedUid(null);
    }
  };

  const handlePlayerClick = (uid: string) => {
    if (isUpdating) return;
    if (!selectedUid) {
      setSelectedUid(uid);
    } else if (selectedUid === uid) {
      setSelectedUid(null);
    } else {
      void handleSwap(selectedUid, uid);
    }
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedPlayers.length) return;
    const playerA = sortedPlayers[index];
    const playerB = sortedPlayers[targetIndex];
    if (playerA && playerB) {
      void handleSwap(playerA.uid, playerB.uid);
    }
  };

  return (
    <div className="mt-2 space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 space-y-1">
        <p className="font-semibold text-white">{t("arrange_seats_tap_hint")}</p>
        {selectedUid && (
          <p className="text-amber-300 animate-pulse font-medium">{t("arrange_seats_selected")}</p>
        )}
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const isSelected = selectedUid === player.uid;
          return (
            <div
              key={player.uid}
              onClick={() => handlePlayerClick(player.uid)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 transition-all cursor-pointer select-none",
                isSelected
                  ? "border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400"
                  : "border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/8",
              )}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {player.displayName ?? "Unnamed"}
                </p>
                {player.role === "host" && (
                  <span className="text-[10px] text-amber-300 font-medium leading-none">Host</span>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={index === 0 || isUpdating}
                  onClick={() => handleMoveStep(index, -1)}
                  className="rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === sortedPlayers.length - 1 || isUpdating}
                  onClick={() => handleMoveStep(index, 1)}
                  className="rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {onStartTableRearrange && (
        <Button
          type="button"
          onClick={onStartTableRearrange}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs h-10 border border-white/20"
        >
          {t("arrange_on_table")}
        </Button>
      )}
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
  roomId,
  isHost,
  canArrangeSeats,
  players,
  allInMode,
  maxAllInAmount,
  bgThemeId,
  tableThemeId,
  cardThemeId,
  onSelectBg,
  onSelectTable,
  onSelectCard,
  onStartTableRearrange,
  onClose,
}: {
  open: boolean;
  roomId?: string;
  isHost?: boolean;
  canArrangeSeats?: boolean;
  players?: RoomPlayerListItem[];
  allInMode?: boolean;
  maxAllInAmount?: number;
  bgThemeId: BgThemeId;
  tableThemeId: TableThemeId;
  cardThemeId: CardThemeId;
  onSelectBg: (id: BgThemeId) => void;
  onSelectTable: (id: TableThemeId) => void;
  onSelectCard: (id: CardThemeId) => void;
  onStartTableRearrange?: () => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState<Page>("main");
  const locale = useLocale();
  const isTh = locale === "th";
  const t = useTranslations("room_settings");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPage("main");
      onClose();
    }
  };

  const title =
    page === "main"
      ? isTh
        ? "ตั้งค่า"
        : "Settings"
      : page === "theme"
        ? isTh
          ? "ธีม"
          : "Theme"
        : t("arrange_seats");

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
          <MainPage
            onGoTheme={() => setPage("theme")}
            onGoSeats={() => setPage("seats")}
            roomId={roomId}
            isHost={isHost}
            canArrangeSeats={canArrangeSeats}
            allInMode={allInMode}
            maxAllInAmount={maxAllInAmount}
          />
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

        {page === "seats" && (
          <SeatsPage
            roomId={roomId}
            players={players}
            onStartTableRearrange={() => {
              onStartTableRearrange?.();
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
