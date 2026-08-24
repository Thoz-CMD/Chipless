import { getTranslations } from "next-intl/server";
import { HistoryView } from "@/features/game-history/history-view";

export default async function HistoryPage() {
  const t = await getTranslations("history");
  const tCommon = await getTranslations("common");

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-black text-white">
      <div className="mx-auto min-h-[100svh] w-full max-w-[430px] px-4 py-6 md:px-6 lg:max-w-[430px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-400">{t("subtitle")}</p>
        </div>
        <HistoryView />
      </div>
    </main>
  );
}
