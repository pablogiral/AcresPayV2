import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, claims, lineItems, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { updateSharedSchema } from "@/lib/validators/bills";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { itemId } = await params;
  const ownedItem = await db
    .select({ id: lineItems.id, billId: lineItems.billId, billClosed: bills.isClosed })
    .from(lineItems)
    .innerJoin(bills, eq(lineItems.billId, bills.id))
    .where(and(eq(lineItems.id, itemId), eq(bills.userId, authCheck.userId)))
    .limit(1);

  if (!ownedItem[0]) {
    return jsonError("Sin permisos", 403);
  }
  if (ownedItem[0].billClosed) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
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

  await db.delete(claims).where(eq(claims.lineItemId, itemId));
  if (parsed.data.isShared) {
    const billParticipants = await db.query.participants.findMany({
      where: eq(participants.billId, ownedItem[0].billId)
    });

    if (billParticipants.length > 0) {
      await db.insert(claims).values(
        billParticipants.map((participant) => ({
          id: makeId("clm"),
          lineItemId: itemId,
          participantId: participant.id,
          quantity: 1,
          isShared: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
    }
  }

  await resetBillPayments(ownedItem[0].billId);

  return jsonOk({ item: updated[0] });
}
