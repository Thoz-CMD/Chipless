"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { createRoom } from "@/features/rooms/services/create-room";
import {
  clearPendingCreateRoom,
  loadPendingCreateRoom,
} from "@/features/rooms/services/pending-create-room";
import type { CreateRoomFormValues } from "@/lib/validations/create-room";
import {
  playerNameSchema,
  type PlayerNameFormValues,
} from "@/lib/validations/player-name";

type PendingCreateState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; draft: CreateRoomFormValues };

export function CreateRoomPlayerNameForm() {
  const router = useRouter();
  const [setupState, setSetupState] = useState<PendingCreateState>({
    status: "loading",
  });

  const form = useForm<PlayerNameFormValues>({
    resolver: zodResolver(playerNameSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const draft = loadPendingCreateRoom();
      setSetupState(draft ? { status: "ready", draft } : { status: "missing" });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  async function onSubmit(values: PlayerNameFormValues) {
    if (setupState.status !== "ready") {
      toast.error("Room setup data is missing. Please create the room again.");
      return;
    }

    try {
      const { roomId } = await createRoom({
        ...setupState.draft,
        hostDisplayName: values.displayName,
      });

      clearPendingCreateRoom();
      toast.success("Room created.");
      router.push(`/room/${roomId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create room. Please try again.";

      toast.error(message);
    }
  }

  return (
    <section className="rounded-2xl border border-white/45 bg-black/55 p-5 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm">
      {setupState.status === "loading" ? (
        <p className="text-center text-sm text-white/65">Loading...</p>
      ) : null}

      {setupState.status === "missing" ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-red-200">
            Room setup data is missing. Please create the room again.
          </p>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-white bg-white text-base font-bold text-black hover:bg-neutral-100"
          >
            <NextLink href="/create-room">
              <ArrowLeft className="size-5" aria-hidden="true" />
              Back
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
              {setupState.draft.roomName}
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
                {form.formState.isSubmitting ? "Creating..." : "Continue"}
              </Button>
            </form>
          </Form>
        </div>
      ) : null}
    </section>
  );
}
