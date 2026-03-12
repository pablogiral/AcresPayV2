import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, claims, lineItems, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { addLineItemSchema } from "@/lib/validators/bills";

export async function POST(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { billId } = await params;
  const bill = await db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, authCheck.userId))
  });

  if (!bill) {
    return jsonError("Ticket no encontrado", 404);
  }

  if (bill.isClosed) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = addLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const totalPriceCents = parsed.data.totalPriceCents;
  const unitPriceCents =
    parsed.data.quantity > 0 ? Math.round(totalPriceCents / parsed.data.quantity) : totalPriceCents;

  const created = await db
    .insert(lineItems)
    .values({
      id: makeId("itm"),
      billId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents,
      totalPriceCents,
      isShared: parsed.data.isShared,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  const createdItem = created[0];

  if (createdItem?.isShared) {
    const billParticipants = await db.query.participants.findMany({
      where: eq(participants.billId, billId)
    });

    if (billParticipants.length > 0) {
      await db.insert(claims).values(
        billParticipants.map((participant) => ({
          id: makeId("clm"),
          lineItemId: createdItem.id,
          participantId: participant.id,
          quantity: 1,
          isShared: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
    }
  }

  await db
    .update(bills)
    .set({
      totalCents: sql`${bills.totalCents} + ${totalPriceCents}`,
      updatedAt: new Date()
    })
    .where(eq(bills.id, billId));

  await resetBillPayments(billId);

  return jsonOk({ item: createdItem }, 201);
}
