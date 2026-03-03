import { and, count, eq, inArray, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, participants, payments } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateFriendSchema } from "@/lib/validators/friends";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateFriendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const friend = await db.query.friends.findFirst({
    where: and(eq(friends.id, id), eq(friends.userId, authCheck.userId))
  });

  if (!friend) {
    return jsonError("Amigo no encontrado", 404);
  }

  const updated = await db
    .update(friends)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      updatedAt: new Date()
    })
    .where(and(eq(friends.id, id), eq(friends.userId, authCheck.userId)))
    .returning();

  return jsonOk({ friend: updated[0] });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const friend = await db.query.friends.findFirst({
    where: and(eq(friends.id, id), eq(friends.userId, authCheck.userId))
  });

  if (!friend) {
    return jsonError("Amigo no encontrado", 404);
  }

  const friendParticipants = await db
    .select({ id: participants.id })
    .from(participants)
    .innerJoin(bills, eq(participants.billId, bills.id))
    .where(and(eq(participants.friendId, id), eq(bills.userId, authCheck.userId)));

  if (friendParticipants.length > 0) {
    const participantIds = friendParticipants.map((row) => row.id);
    const pending = await db
      .select({ value: count() })
      .from(payments)
      .where(
        and(
          eq(payments.isPaid, false),
          or(
            inArray(payments.fromParticipantId, participantIds),
            inArray(payments.toParticipantId, participantIds)
          )
        )
      );

    const pendingCount = Number(pending[0]?.value ?? 0);
    if (pendingCount > 0) {
      return jsonError("No se puede eliminar: hay pagos pendientes asociados", 409);
    }
  }

  await db.delete(friends).where(and(eq(friends.id, id), eq(friends.userId, authCheck.userId)));

  return jsonOk({ ok: true });
}
