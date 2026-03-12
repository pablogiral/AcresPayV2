import { z } from "zod";

const hexColorSchema = z.string().regex(/^#([0-9a-fA-F]{6})$/, "Color inválido");

export const createFriendSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: hexColorSchema
});

export const updateFriendSchema = createFriendSchema.partial().refine((data) => data.name || data.color, {
  message: "Debes enviar al menos un campo"
});
