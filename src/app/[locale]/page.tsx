import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  Link as LinkIcon,
  LockKeyhole,
  LogIn,
  UserRoundPlus,
  History,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

const backgroundSrc =
  "/images/background/ChatGPT Image 27 ก.ค. 2569 18_21_14.png";
const logoSrc = "/images/logo/ChatGPT Image 27 ก.ค. 2569 18_26_31.png";

export default async function Home() {
  const t = await getTranslations("home");
  return (
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-black text-white">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/10" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col items-center justify-center px-6 py-8">
        <div className="absolute top-8 right-6 z-20 flex items-center gap-3">
          <Link
            href="/history"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/80 bg-black/70 shadow-[0_0_18px_rgba(255,255,255,0.08)] backdrop-blur-sm transition-colors hover:bg-black/85 focus:ring-2 focus:ring-white/70 focus:outline-none"
            aria-label="Game History"
          >
            <History className="h-5 w-5" aria-hidden="true" />
          </Link>
          <LanguageSwitcher />
        </div>
        
        <div className="flex flex-col items-center gap-24">
          <div className="flex flex-col items-center">
            <Image
              src={logoSrc}
              alt="StackSplit"
              width={400}
              height={400}
              priority
              className="h-auto w-[min(90%,400px)] object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.32)]"
            />
            <h1 className="font-audiowide mt-[clamp(12px,2svh,24px)] text-center text-[clamp(42px,14vw,60px)] leading-none tracking-normal text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.35)]">
              {t("title")}
            </h1>
          </div>

          <section className="w-full space-y-[clamp(14px,2.6svh,20px)]">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/create-room"
              className="flex h-[clamp(58px,8svh,66px)] items-center justify-center gap-2.5 rounded-lg border border-white/80 bg-black/70 px-2.5 text-[clamp(13px,3.7vw,15px)] font-semibold shadow-[0_0_18px_rgba(255,255,255,0.08)] backdrop-blur-sm transition-colors hover:bg-black/85 focus:ring-2 focus:ring-white/70 focus:outline-none"
            >
              <UserRoundPlus className="size-6 shrink-0" aria-hidden="true" />
              <span>{t("create_room")}</span>
            </Link>

            <Link
              href="/join-room"
              className="flex h-[clamp(58px,8svh,66px)] items-center justify-center gap-2.5 rounded-lg border border-white bg-white px-2.5 text-[clamp(13px,3.7vw,15px)] font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.18)] transition-colors hover:bg-neutral-100 focus:ring-2 focus:ring-white/80 focus:outline-none"
            >
              <LogIn className="size-6 shrink-0" aria-hidden="true" />
              <span>{t("join_room")}</span>
            </Link>
          </div>

          <div className="relative grid grid-cols-2 gap-3 text-[10px] leading-snug text-white/68">
            <div
              className="absolute top-1/2 left-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55"
              aria-hidden="true"
            />
            <p className="flex items-center justify-center gap-2">
              <LinkIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("share_link_description")}</span>
            </p>

            <p className="flex items-center justify-center gap-2">
              <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("enter_pin_description")}</span>
            </p>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
