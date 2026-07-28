import { z } from "zod";

export const joinRoomPasscodeSchema = z.object({
  roomPasscode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9]{4,12}$/,
      "Passcode must be 4-12 English letters or numbers.",
    ),
});

export type JoinRoomPasscodeFormValues = z.infer<typeof joinRoomPasscodeSchema>;
