import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, lineItems } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateSharedSchema } from "@/lib/validators/bills";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { itemId } = await params;
  const ownedItem = await db
    .select({ id: lineItems.id })
    .from(lineItems)
    .innerJoin(bills, eq(lineItems.billId, bills.id))
    .where(and(eq(lineItems.id, itemId), eq(bills.userId, authCheck.userId)))
    .limit(1);

  if (!ownedItem[0]) {
    return jsonError("Sin permisos", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSharedSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const updated = await db
    .update(lineItems)
    .set({
      isShared: parsed.data.isShared,
      updatedAt: new Date()
    })
    .where(eq(lineItems.id, itemId))
    .returning();

  if (!updated[0]) {
    return jsonError("Item no encontrado", 404);
  }

  return jsonOk({ item: updated[0] });
}
