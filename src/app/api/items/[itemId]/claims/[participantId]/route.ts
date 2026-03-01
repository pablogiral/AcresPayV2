import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, claims, lineItems, participants } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { claimSchema } from "@/lib/validators/bills";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string; participantId: string }> }
) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { itemId, participantId } = await params;
  const allowed = await db
    .select({ itemId: lineItems.id, participantId: participants.id })
    .from(lineItems)
    .innerJoin(bills, eq(lineItems.billId, bills.id))
    .innerJoin(participants, eq(participants.billId, bills.id))
    .where(
      and(
        eq(lineItems.id, itemId),
        eq(participants.id, participantId),
        eq(bills.userId, authCheck.userId)
      )
    )
    .limit(1);

  if (!allowed[0]) {
    return jsonError("Sin permisos", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const existing = await db.query.claims.findFirst({
    where: and(eq(claims.lineItemId, itemId), eq(claims.participantId, participantId))
  });

  if (existing) {
    const updated = await db
      .update(claims)
      .set({
        quantity: parsed.data.quantity,
        isShared: parsed.data.isShared,
        updatedAt: new Date()
      })
      .where(and(eq(claims.lineItemId, itemId), eq(claims.participantId, participantId)))
      .returning();

    return jsonOk({ claim: updated[0] });
  }

  const created = await db
    .insert(claims)
    .values({
      id: makeId("clm"),
      lineItemId: itemId,
      participantId,
      quantity: parsed.data.quantity,
      isShared: parsed.data.isShared,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return jsonOk({ claim: created[0] }, 201);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ itemId: string; participantId: string }> }
) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { itemId, participantId } = await params;
  const allowed = await db
    .select({ itemId: lineItems.id, participantId: participants.id })
    .from(lineItems)
    .innerJoin(bills, eq(lineItems.billId, bills.id))
    .innerJoin(participants, eq(participants.billId, bills.id))
    .where(
      and(
        eq(lineItems.id, itemId),
        eq(participants.id, participantId),
        eq(bills.userId, authCheck.userId)
      )
    )
    .limit(1);

  if (!allowed[0]) {
    return jsonError("Sin permisos", 403);
  }

  await db.delete(claims).where(and(eq(claims.lineItemId, itemId), eq(claims.participantId, participantId)));

  return jsonOk({ ok: true });
}
