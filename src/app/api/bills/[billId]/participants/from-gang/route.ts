import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, gangMembers, gangs, participants } from "@/lib/db/schema";
import { resetBillPayments } from "@/lib/db/payments";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";

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

  const body = (await req.json().catch(() => null)) as { gangId?: string } | null;
  if (!body?.gangId) {
    return jsonError("Debes enviar gangId", 400);
  }

  const gang = await db.query.gangs.findFirst({
    where: and(eq(gangs.id, body.gangId), eq(gangs.userId, authCheck.userId))
  });
  if (!gang) {
    return jsonError("Pandilla no encontrada", 404);
  }

  const members = await db.query.gangMembers.findMany({
    where: eq(gangMembers.gangId, gang.id)
  });

  const friendIds = members.map((member) => member.friendId);
  if (friendIds.length === 0) {
    return jsonOk({ addedCount: 0 });
  }

  const existingParticipants = await db.query.participants.findMany({
    where: and(eq(participants.billId, billId), inArray(participants.friendId, friendIds))
  });
  const existingFriendIds = new Set(existingParticipants.map((participant) => participant.friendId).filter(Boolean));

  const gangFriends = await db.query.friends.findMany({
    where: and(eq(friends.userId, authCheck.userId), inArray(friends.id, friendIds))
  });

  const toAdd = gangFriends.filter((friend) => !existingFriendIds.has(friend.id));
  if (toAdd.length === 0) {
    return jsonOk({ addedCount: 0 });
  }

  await db.insert(participants).values(
    toAdd.map((friend) => ({
      id: makeId("par"),
      billId,
      friendId: friend.id,
      name: friend.name,
      color: friend.color,
      createdAt: new Date()
    }))
  );

  await resetBillPayments(billId);

  return jsonOk({ addedCount: toAdd.length });
}
