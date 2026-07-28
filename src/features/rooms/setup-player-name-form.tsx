"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { get, ref } from "firebase/database";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signInWithAnonymousAccount } from "@/features/auth/anonymous-auth";
import {
  isRoomPlayerRecord,
  type RoomPlayerRecord,
} from "@/features/rooms/services/player-record";
import { updatePlayerName } from "@/features/rooms/services/update-player-name";
import { getFirebaseAuth, getRealtimeDatabase } from "@/lib/firebase/client";
import {
  playerNameSchema,
  type PlayerNameFormValues,
} from "@/lib/validations/player-name";

type SetupNameState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; roomName: string; player: RoomPlayerRecord };

function isRoomNameValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function SetupPlayerNameForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [setupState, setSetupState] = useState<SetupNameState>({
    status: "loading",
  });

  const form = useForm<PlayerNameFormValues>({
    resolver: zodResolver(playerNameSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSetupData() {
      try {
        const auth = getFirebaseAuth();

        if (!auth.currentUser) {
          await signInWithAnonymousAccount();
        }

        const uid = getFirebaseAuth().currentUser?.uid;

        if (!uid) {
          throw new Error("Unable to identify current player.");
        }

        const database = getRealtimeDatabase();
        const [roomNameSnapshot, playerSnapshot] = await Promise.all([
          get(ref(database, `rooms/${roomId}/name`)),
          get(ref(database, `roomPlayers/${roomId}/${uid}`)),
        ]);
        const roomNameValue: unknown = roomNameSnapshot.val();
        const playerValue: unknown = playerSnapshot.val();

        if (!isRoomNameValue(roomNameValue)) {
          throw new Error("Room not found.");
        }

        if (!playerSnapshot.exists() || !isRoomPlayerRecord(playerValue)) {
          router.replace("/");
          return;
        }

        if (isMounted) {
          setSetupState({
            status: "ready",
            roomName: roomNameValue,
            player: playerValue,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load setup page. Please try again.";

        if (isMounted) {
          setSetupState({ status: "error", message });
        }
      }
    }

    void loadSetupData();

    return () => {
      isMounted = false;
    };
  }, [roomId, router]);

  async function onSubmit(values: PlayerNameFormValues) {
    try {
      await updatePlayerName(roomId, values);
      toast.success("Name saved.");
      router.push(`/room/${roomId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save player name. Please try again.";

      toast.error(message);
    }
  }

  return (
    <section className="rounded-2xl border border-white/45 bg-black/55 p-5 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
      {setupState.status === "loading" ? (
        <p className="text-center text-sm text-white/65">Loading...</p>
      ) : null}

      {setupState.status === "error" ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-red-200">{setupState.message}</p>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
          >
            <NextLink href="/">
              <ArrowLeft className="size-5" aria-hidden="true" />
              Back Home
            </NextLink>
          </Button>
        </div>
      ) : null}

      {setupState.status === "ready" ? (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-xs tracking-[0.2em] text-white/45 uppercase">
              Room
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {setupState.roomName}
            </h2>
            <p className="mt-3 text-base text-white/65">Enter your name</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base text-white">
                      <UserRoundCheck className="size-5" aria-hidden="true" />
                      Player Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your name"
                        autoComplete="off"
                        maxLength={20}
                        className="h-14 border-white/40 bg-black/35 text-base text-white placeholder:text-white/45 focus-visible:ring-white/40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="h-14 w-full rounded-lg border border-white bg-white text-lg font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-100"
              >
                {form.formState.isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </form>
          </Form>
        </div>
      ) : null}
    </section>
  );
}
