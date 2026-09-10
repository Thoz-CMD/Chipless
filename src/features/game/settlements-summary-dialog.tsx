"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SettlementsSummary } from "@/features/game/services/calculate-settlements-summary";
import { formatTransfersForLine } from "@/features/game/services/calculate-settlements-summary";

type SettlementsSummaryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  summary: SettlementsSummary;
  currency: string;
};

export function SettlementsSummaryDialog({
  isOpen,
  onClose,
  summary,
  currency,
}: SettlementsSummaryDialogProps) {
  const t = useTranslations("settlements_summary");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      toast.success(t("copied"));
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const transfersText = formatTransfersForLine(
    summary.playerNets,
    summary.transfers,
    currency,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold text-white">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* สรุปยอดสุทธิ */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-white/90">
              {t("net_summary")}
            </h3>
            
            {/* ฝ่ายได้เงิน */}
            {summary.winners.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2">
                <p className="text-sm font-bold text-emerald-400">
                  {t("winners")}
                </p>
                <ul className="space-y-1.5">
                  {summary.winners.map((player) => (
                    <li
                      key={player.uid}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold text-white">
                        {player.displayName}
                      </span>
                      <span className="font-bold text-emerald-400">
                        +{player.netAmount} {currency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ฝ่ายจ่ายเงิน */}
            {summary.losers.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 space-y-2">
                <p className="text-sm font-bold text-red-400">
                  {t("losers")}
                </p>
                <ul className="space-y-1.5">
                  {summary.losers.map((player) => (
                    <li
                      key={player.uid}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold text-white">
                        {player.displayName}
                      </span>
                      <span className="font-bold text-red-400">
                        {player.netAmount} {currency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* วิธีโอนที่สั้นที่สุด */}
          {summary.transfers.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-base font-bold text-white/90">
                {t("transfer_instructions")}
              </h3>

              <div className="rounded-xl border border-white/20 bg-white/5 p-3 space-y-2">
                {summary.transfers.map((transfer, index) => (
                  <div
                    key={`${transfer.from}-${transfer.to}-${index}`}
                    className="flex items-center justify-between border-b border-white/10 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex-1 text-sm">
                      <span className="font-semibold text-white">
                        {transfer.fromName}
                      </span>
                      <span className="mx-1.5 text-white/40">→</span>
                      <span className="font-semibold text-white">
                        {transfer.toName}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-blue-400">
                      {transfer.amount} {currency}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* สรุปย่อสำหรับส่งไลน์ */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-white/90">
              {t("line_summary")}
            </h3>
            <div className="rounded-xl border border-white/20 bg-black/40 p-3">
              <pre className="text-xs whitespace-pre-wrap font-mono text-white/80">
                {transfersText}
              </pre>
            </div>
            <button
              onClick={() => handleCopy(transfersText, "line")}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/15"
            >
              <Copy className="h-4 w-4" />
              {copiedSection === "line" ? t("copied") : t("copy_line")}
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
