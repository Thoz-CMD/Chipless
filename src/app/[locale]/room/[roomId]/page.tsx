import Image from "next/image";

import { RoomSummary } from "@/features/rooms/room-summary";

const backgroundSrc =
  "/images/background/ChatGPT Image 27 ก.ค. 2569 18_21_14.png";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

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

      <div className="relative z-10 mx-auto min-h-dvh w-full max-w-[520px] px-4 pt-[calc(env(safe-area-inset-top)+22px)] pb-[calc(env(safe-area-inset-bottom)+22px)]">
        <RoomSummary roomId={roomId} />
      </div>
    </main>
  );
}
