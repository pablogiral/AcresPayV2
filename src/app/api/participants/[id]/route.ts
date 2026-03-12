import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id)
  });

  if (!participant) {
    return jsonError("Participante no encontrado", 404);
  }

  const ownerBill = await db.query.bills.findFirst({
    where: and(eq(bills.id, participant.billId), eq(bills.userId, authCheck.userId))
  });

  if (!ownerBill) {
    return jsonError("Sin permisos", 403);
  }
  if (ownerBill.isClosed) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
  }

  await db.delete(participants).where(eq(participants.id, id));
  if (ownerBill.payerParticipantId === id) {
    await db.update(bills).set({ payerParticipantId: null }).where(eq(bills.id, ownerBill.id));
  }
  await resetBillPayments(ownerBill.id);
  return jsonOk({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const body = await req.json().catch(() => null) as { friendId?: string } | null;
  if (!body?.friendId) {
    return jsonError("Debes enviar friendId", 400);
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id)
  });

  if (!participant) {
    return jsonError("Participante no encontrado", 404);
  }

  const ownerBill = await db.query.bills.findFirst({
    where: and(eq(bills.id, participant.billId), eq(bills.userId, authCheck.userId))
  });

  if (!ownerBill) {
    return jsonError("Sin permisos", 403);
  }
  if (ownerBill.isClosed) {
    return jsonError("El ticket está cerrado. Reábrelo para editarlo.", 409);
  }

  const friend = await db.query.friends.findFirst({
    where: and(eq(friends.id, body.friendId), eq(friends.userId, authCheck.userId))
  });

  if (!friend) {
    return jsonError("Amigo no encontrado", 404);
  }

  const [updated] = await db
    .update(participants)
    .set({
      friendId: friend.id,
      name: friend.name,
      color: friend.color
    })
    .where(eq(participants.id, id))
    .returning();

  await resetBillPayments(ownerBill.id);

  return jsonOk({ participant: updated });
}
