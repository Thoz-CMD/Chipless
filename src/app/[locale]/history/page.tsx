import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HistoryView } from "@/features/game-history/history-view";

const backgroundSrc =
  "/images/background/ChatGPT Image 27 ก.ค. 2569 18_21_14.png";

export default async function HistoryPage() {
  const t = await getTranslations("history");
  const tCommon = await getTranslations("common");

  return (
    <main className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-black text-white">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+26px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <header className="mb-6">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full border border-white/25 bg-black/35 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/" aria-label={tCommon("back_to_home")}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        <section className="mb-6">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-400">{t("subtitle")}</p>
        </section>

        <HistoryView />
      </div>
    </main>
  );
}
