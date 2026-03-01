import { z } from "zod";
import { FRIEND_COLORS } from "@/lib/constants";

export const createBillSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

export const updateBillSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    payerParticipantId: z.string().min(1).optional()
  })
  .refine((data) => data.name !== undefined || data.payerParticipantId !== undefined, {
    message: "Debes enviar al menos un campo"
  });

export const addParticipantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.enum(FRIEND_COLORS),
  friendId: z.string().optional()
});

export const addLineItemSchema = z.object({
  description: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().min(0),
  isShared: z.boolean().default(false)
});

export const updateSharedSchema = z.object({
  isShared: z.boolean()
});

export const claimSchema = z.object({
  quantity: z.number().int().min(0),
  isShared: z.boolean().default(false)
});

export const paymentSchema = z.object({
  fromParticipantId: z.string().min(1),
  toParticipantId: z.string().min(1),
  amountCents: z.number().int().min(0),
  isPaid: z.boolean()
});

export const combinedSettlementSchema = z.object({
  billIds: z.array(z.string().min(1)).min(2)
});
