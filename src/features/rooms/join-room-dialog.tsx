"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { joinRoom } from "@/features/rooms/services/join-room";
import type { WaitingRoomListItem } from "@/features/rooms/services/list-rooms";
import {
  joinRoomPasscodeSchema,
  type JoinRoomPasscodeFormValues,
} from "@/lib/validations/join-room-passcode";

type JoinRoomDialogProps = {
  room: WaitingRoomListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JoinRoomDialog({
  room,
  open,
  onOpenChange,
}: JoinRoomDialogProps) {
  const [showPasscode, setShowPasscode] = useState(false);
  const router = useRouter();

  const form = useForm<JoinRoomPasscodeFormValues>({
    resolver: zodResolver(joinRoomPasscodeSchema),
    defaultValues: {
      roomPasscode: "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setShowPasscode(false);
    }

    onOpenChange(nextOpen);
  }

  async function onSubmit(values: JoinRoomPasscodeFormValues) {
    if (!room) {
      toast.error("Room no longer exists");
      return;
    }

    try {
      const { roomId } = await joinRoom({
        roomId: room.id,
        roomPasscode: values.roomPasscode,
      });

      toast.success("Joined room.");
      handleOpenChange(false);
      router.push(`/room/${roomId}/setup-name`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to join room. Please try again.";

      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/35 bg-black/90 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)]">
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
          <DialogDescription className="text-white/60">
            {room
              ? `${room.name} · ${room.id}`
              : "Selected room is unavailable"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="roomPasscode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    <LockKeyhole className="size-5" aria-hidden="true" />
                    Room Passcode
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPasscode ? "text" : "password"}
                        placeholder="STACK1234"
                        autoComplete="off"
                        className="h-14 border-white/40 bg-black/35 pr-12 text-base text-white placeholder:text-white/45 focus-visible:ring-white/40"
                        {...field}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPasscode ? "Hide passcode" : "Show passcode"
                        }
                        onClick={() => setShowPasscode((value) => !value)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-white/70 transition-colors hover:text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
                      >
                        {showPasscode ? (
                          <EyeOff className="size-5" aria-hidden="true" />
                        ) : (
                          <Eye className="size-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
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
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !room}
                className="border border-white bg-white font-bold text-black hover:bg-neutral-100"
              >
                <LogIn className="size-5" aria-hidden="true" />
                {form.formState.isSubmitting ? "Joining..." : "Join"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
