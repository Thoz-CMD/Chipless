import { z } from "zod";

export const createRoomSchema = z.object({
  roomName: z
    .string()
    .trim()
    .min(2, "Room name must be at least 2 characters.")
    .max(30, "Room name must be 30 characters or less."),
  roomPasscode: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits."),
  bigBlind: z
    .number("Big Blind is required.")
    .int("Big Blind must be a whole number.")
    .positive("Big Blind must be greater than 0."),
});

export type CreateRoomFormValues = z.infer<typeof createRoomSchema>;
