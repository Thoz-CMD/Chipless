import { z } from "zod";

export const reservedPlayerNames = ["host", "player"] as const;

export const playerNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(20, "Name must be 20 characters or less.")
    .refine(
      (value) =>
        !reservedPlayerNames.includes(value.toLowerCase() as "host" | "player"),
      'Name cannot be "Host" or "Player".',
    ),
  photoUrl: z.string().optional(),
});

export type PlayerNameFormValues = z.infer<typeof playerNameSchema>;
