import { getTranslations } from "next-intl/server";
import { HistoryDetailView } from "@/features/game-history/history-detail-view";

type HistoryDetailPageProps = {
  params: Promise<{
    historyKey: string;
  }>;
};

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { historyKey } = await params;
  const t = await getTranslations("history");

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-black text-white">
      <div className="mx-auto min-h-[100svh] w-full max-w-[430px] px-4 py-6 md:px-6 lg:max-w-[430px]">
        <HistoryDetailView historyKey={historyKey} />
      </div>
    </main>
  );
}
