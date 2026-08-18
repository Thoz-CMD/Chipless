import { z } from "zod";

export const joinRoomPasscodeSchema = z.object({
  roomPasscode: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits."),
});

export type JoinRoomPasscodeFormValues = z.infer<typeof joinRoomPasscodeSchema>;
