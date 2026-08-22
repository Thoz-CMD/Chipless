"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign, LockKeyhole, LogIn, UsersRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { savePendingCreateRoom } from "@/features/rooms/services/pending-create-room";
import {
  createRoomSchema,
  type CreateRoomFormValues,
} from "@/lib/validations/create-room";
import { cn } from "@/lib/utils";

const blindPresets = [1, 2, 5, 10] as const;

export function CreateRoomForm() {
  const router = useRouter();
  const t = useTranslations("create_room");
  const tCommon = useTranslations("common");

  const form = useForm<CreateRoomFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      roomName: "",
      roomPasscode: "",
      bigBlind: undefined,
    },
  });

  async function onSubmit(values: CreateRoomFormValues) {
    savePendingCreateRoom(values);
    router.push("/room/setup-name");
  }

  function selectBlindPreset(value: number) {
    form.setValue("bigBlind", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-white/45 bg-black/55 p-5 shadow-[0_0_32px_rgba(255,255,255,0.12)] backdrop-blur-sm"
      >
        <div className="space-y-7">
          <FormField
            control={form.control}
            name="roomName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base text-white">
                  <UsersRound className="size-5" aria-hidden="true" />
                  {t("room_name")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("room_name_placeholder")}
                    autoComplete="off"
                    className="h-14 border-white/40 bg-black/35 text-base text-white placeholder:text-white/45 focus-visible:ring-white/40"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomPasscode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base text-white">
                  <LockKeyhole className="size-5" aria-hidden="true" />
                  {t("room_pin")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={t("room_pin_placeholder")}
                    autoComplete="off"
                    className="h-14 border-white/40 bg-black/35 text-base text-white placeholder:text-white/45 focus-visible:ring-white/40"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-white/55">
                  {t("room_pin_description")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bigBlind"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base text-white">
                  <CircleDollarSign className="size-5" aria-hidden="true" />
                  {t("big_blind")}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl text-white/90">
                      ฿
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      className="h-14 border-white/40 bg-black/35 pl-11 text-right text-xl text-white placeholder:text-white/45 focus-visible:ring-white/40"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-white/55">
                  {t("big_blind_description")}
                </FormDescription>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {blindPresets.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectBlindPreset(value)}
                      className={cn(
                        "h-11 rounded-lg border border-white/30 bg-black/35 text-sm text-white transition-colors hover:border-white/60 hover:bg-white/10",
                        field.value === value &&
                          "border-white bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.45)]",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-8 h-14 w-full rounded-lg border border-white bg-white text-lg font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-100"
        >
          <LogIn className="size-7" aria-hidden="true" />
          {form.formState.isSubmitting ? tCommon("creating") : t("button")}
        </Button>
      </form>
    </Form>
  );
}
