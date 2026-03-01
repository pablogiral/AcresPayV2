import { z } from "zod";
import { FRIEND_COLORS } from "@/lib/constants";

export const createFriendSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.enum(FRIEND_COLORS)
});

export const updateFriendSchema = createFriendSchema.partial().refine((data) => data.name || data.color, {
  message: "Debes enviar al menos un campo"
});
