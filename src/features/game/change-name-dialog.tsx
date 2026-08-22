"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoundCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/features/rooms/avatar-picker";
import { updatePlayerName } from "@/features/rooms/services/update-player-name";
import {
  loadLastPlayerPhoto,
  saveLastPlayerName,
  saveLastPlayerPhoto,
} from "@/features/rooms/services/last-player-name";
import {
  playerNameSchema,
  type PlayerNameFormValues,
} from "@/lib/validations/player-name";

type ChangeNameDialogProps = {
  roomId: string;
  currentDisplayName: string;
  currentPhotoUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangeNameDialog({
  roomId,
  currentDisplayName,
  currentPhotoUrl,
  open,
  onOpenChange,
}: ChangeNameDialogProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const form = useForm<PlayerNameFormValues>({
    resolver: zodResolver(playerNameSchema),
    defaultValues: {
      displayName: currentDisplayName,
      photoUrl: currentPhotoUrl ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      const savedPhoto = currentPhotoUrl || loadLastPlayerPhoto();
      form.reset({
        displayName: currentDisplayName,
        photoUrl: savedPhoto,
      });
    }
  }, [open, currentDisplayName, currentPhotoUrl, form]);

  async function onSubmit(values: PlayerNameFormValues) {
    try {
      saveLastPlayerName(values.displayName);
      saveLastPlayerPhoto(values.photoUrl);
      await updatePlayerName(roomId, values);
      toast.success(t("profile_updated"));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("profile_update_error");

      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)]">
        <DialogHeader>
          <DialogTitle>{t("edit_profile")}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t("edit_profile_description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AvatarPicker
                      value={field.value}
                      onChange={field.onChange}
                      name={form.watch("displayName")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    <UserRoundCheck className="size-5" aria-hidden="true" />
                    {t("player_name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("player_name_placeholder")}
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

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={form.formState.isSubmitting}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {tCommon("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="border border-white bg-white font-bold text-black hover:bg-neutral-100"
              >
                {form.formState.isSubmitting ? tCommon("saving") : t("save_profile")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
