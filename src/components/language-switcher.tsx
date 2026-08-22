"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="flex h-10 items-center gap-2 rounded-lg border border-white/25 bg-black/45 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:ring-2 focus:ring-white/60 focus:outline-none"
      aria-label="Change language"
    >
      <Globe className="size-4" aria-hidden="true" />
      <span className="uppercase">{locale === "th" ? "EN" : "TH"}</span>
    </button>
  );
}
