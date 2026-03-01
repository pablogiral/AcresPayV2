import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, lineItems } from "@/lib/db/schema";
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

  const body = await req.json().catch(() => null);
  const parsed = addLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const totalPriceCents = parsed.data.quantity * parsed.data.unitPriceCents;

  const created = await db
    .insert(lineItems)
    .values({
      id: makeId("itm"),
      billId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPriceCents: parsed.data.unitPriceCents,
      totalPriceCents,
      isShared: parsed.data.isShared,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  await db
    .update(bills)
    .set({
      totalCents: sql`${bills.totalCents} + ${totalPriceCents}`,
      updatedAt: new Date()
    })
    .where(eq(bills.id, billId));

  return jsonOk({ item: created[0] }, 201);
}
