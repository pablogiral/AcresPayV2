import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { addParticipantSchema } from "@/lib/validators/bills";

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
  const parsed = addParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  if (parsed.data.friendId) {
    const friend = await db.query.friends.findFirst({
      where: and(eq(friends.id, parsed.data.friendId), eq(friends.userId, authCheck.userId))
    });

    if (!friend) {
      return jsonError("Amigo no encontrado", 404);
    }

    const existingParticipant = await db.query.participants.findFirst({
      where: and(eq(participants.billId, billId), eq(participants.friendId, parsed.data.friendId))
    });

    if (existingParticipant) {
      return jsonError("Ese amigo ya está añadido a este ticket", 409);
    }
  }

  const created = await db
    .insert(participants)
    .values({
      id: makeId("par"),
      billId,
      friendId: parsed.data.friendId,
      name: parsed.data.name,
      color: parsed.data.color,
      createdAt: new Date()
    })
    .returning();

  await resetBillPayments(billId);

  return jsonOk({ participant: created[0] }, 201);
}
