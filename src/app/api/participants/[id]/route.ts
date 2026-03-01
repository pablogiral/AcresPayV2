import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, participants } from "@/lib/db/schema";
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

  await db.delete(participants).where(eq(participants.id, id));
  return jsonOk({ ok: true });
}
