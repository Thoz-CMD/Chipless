import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateRoomForm } from "@/features/rooms/create-room-form";

const backgroundSrc =
  "/images/background/ChatGPT Image 27 ก.ค. 2569 18_21_14.png";

export default async function CreateRoomPage() {
  const t = await getTranslations("create_room");
  const tCommon = await getTranslations("common");
  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+24px)] sm:px-6">
        <header className="mb-5">
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

        <section className="mb-5 text-center">
          <h2 className="font-audiowide text-3xl leading-tight tracking-normal drop-shadow-[0_0_12px_rgba(255,255,255,0.18)] sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-1.5 text-sm text-white/60">{t("subtitle")}</p>
        </section>

        <CreateRoomForm />
      </div>
    </main>
  );
}
