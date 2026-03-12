import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, lineItems, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateBillSchema } from "@/lib/validators/bills";

export async function GET(_: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { billId } = await params;
  const bill = await db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, authCheck.userId)),
    with: {
      participants: { orderBy: [asc(participants.createdAt)] },
      lineItems: { orderBy: [asc(lineItems.createdAt)] }
    }
  });

  if (!bill) {
    return jsonError("Ticket no encontrado", 404);
  }

  const itemIds = bill.lineItems.map((item) => item.id);
  const allClaims = itemIds.length
    ? await db.query.claims.findMany({
        where: (table, { inArray }) => inArray(table.lineItemId, itemIds)
      })
    : [];

  return jsonOk({ bill: { ...bill, claims: allClaims } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { billId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateBillSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const existing = await db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, authCheck.userId))
  });

  if (!existing) {
    return jsonError("Ticket no encontrado", 404);
  }

  if (existing.isClosed && parsed.data.isClosed !== false) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
  }

  const updated = await db
    .update(bills)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.payerParticipantId !== undefined
        ? { payerParticipantId: parsed.data.payerParticipantId }
        : {}),
      ...(parsed.data.isClosed !== undefined ? { isClosed: parsed.data.isClosed } : {}),
      updatedAt: new Date()
    })
    .where(and(eq(bills.id, billId), eq(bills.userId, authCheck.userId)))
    .returning();

  if (
    parsed.data.payerParticipantId !== undefined &&
    parsed.data.payerParticipantId !== existing.payerParticipantId
  ) {
    await resetBillPayments(billId);
  }

  return jsonOk({ bill: updated[0] });
}
