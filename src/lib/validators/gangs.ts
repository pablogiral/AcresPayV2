import { z } from "zod";

export const createGangSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const updateGangSchema = createGangSchema.partial().refine((data) => data.name !== undefined, {
  message: "Debes enviar al menos un campo"
});

export const updateGangMembersSchema = z.object({
  friendIds: z.array(z.string().min(1)).max(100)
});
