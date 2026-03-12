import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, claims, lineItems } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateLineItemSchema } from "@/lib/validators/bills";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { itemId } = await params;
  const item = await db
    .select({
      id: lineItems.id,
      billId: lineItems.billId,
      quantity: lineItems.quantity,
      totalPriceCents: lineItems.totalPriceCents,
      billClosed: bills.isClosed
    })
    .from(lineItems)
    .innerJoin(bills, eq(lineItems.billId, bills.id))
    .where(and(eq(lineItems.id, itemId), eq(bills.userId, authCheck.userId)))
    .limit(1);

  const currentItem = item[0];
  if (!currentItem) {
    return jsonError("Item no encontrado", 404);
  }
  if (currentItem.billClosed) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  if (parsed.data.quantity < currentItem.quantity) {
    const claimedRows = await db
      .select()
      .from(claims)
      .where(eq(claims.lineItemId, itemId));
    const totalClaimed = claimedRows.reduce((acc, claim) => acc + claim.quantity, 0);
    if (totalClaimed > parsed.data.quantity) {
      return jsonError("Reduce antes las unidades asignadas a participantes", 409);
    }
  }

  const unitPriceCents =
    parsed.data.quantity > 0
      ? Math.round(parsed.data.totalPriceCents / parsed.data.quantity)
      : parsed.data.totalPriceCents;

  const [updatedItem] = await db
    .update(lineItems)
    .set({
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents,
      totalPriceCents: parsed.data.totalPriceCents,
      isShared: parsed.data.isShared,
      updatedAt: new Date()
    })
    .where(eq(lineItems.id, itemId))
    .returning();

  const diff = parsed.data.totalPriceCents - currentItem.totalPriceCents;
  if (diff !== 0) {
    await db
      .update(bills)
      .set({
        totalCents: sql`${bills.totalCents} + ${diff}`,
        updatedAt: new Date()
      })
      .where(eq(bills.id, currentItem.billId));
  } else {
    await db
      .update(bills)
      .set({ updatedAt: new Date() })
      .where(eq(bills.id, currentItem.billId));
  }

  await resetBillPayments(currentItem.billId);

  return jsonOk({ item: updatedItem });
}
