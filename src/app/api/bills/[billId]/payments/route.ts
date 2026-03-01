import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, payments } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { paymentSchema } from "@/lib/validators/bills";

export async function GET(_: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
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

  const rows = await db.query.payments.findMany({
    where: eq(payments.billId, billId)
  });

  return jsonOk({ payments: rows });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
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

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const existing = await db.query.payments.findFirst({
    where: and(
      eq(payments.billId, billId),
      eq(payments.fromParticipantId, parsed.data.fromParticipantId),
      eq(payments.toParticipantId, parsed.data.toParticipantId)
    )
  });

  if (existing) {
    const updated = await db
      .update(payments)
      .set({
        amountCents: parsed.data.amountCents,
        isPaid: parsed.data.isPaid,
        paidAt: parsed.data.isPaid ? new Date() : null,
        updatedByUserId: authCheck.userId,
        updatedAt: new Date()
      })
      .where(eq(payments.id, existing.id))
      .returning();

    return jsonOk({ payment: updated[0] });
  }

  const created = await db
    .insert(payments)
    .values({
      id: makeId("pay"),
      billId,
      fromParticipantId: parsed.data.fromParticipantId,
      toParticipantId: parsed.data.toParticipantId,
      amountCents: parsed.data.amountCents,
      isPaid: parsed.data.isPaid,
      paidAt: parsed.data.isPaid ? new Date() : null,
      updatedByUserId: authCheck.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return jsonOk({ payment: created[0] }, 201);
}
