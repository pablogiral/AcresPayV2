import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, participants, payments } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { createFriendSchema } from "@/lib/validators/friends";

export async function GET() {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const list = await db.query.friends.findMany({
    where: eq(friends.userId, authCheck.userId),
    orderBy: [asc(friends.createdAt)]
  });

  if (list.length === 0) {
    return jsonOk({ friends: [] });
  }

  const usageRows = await db
    .select({
      friendId: participants.friendId,
      usageCount: sql<number>`count(*)`,
      lastUsedAt: sql<string>`max(${bills.date})`
    })
    .from(participants)
    .innerJoin(bills, eq(participants.billId, bills.id))
    .where(
      and(
        eq(bills.userId, authCheck.userId),
        inArray(
          participants.friendId,
          list.map((friend) => friend.id)
        )
      )
    )
    .groupBy(participants.friendId)
    .orderBy(desc(sql`max(${bills.date})`));

  const billIds = list.map((friend) => friend.id);
  const participantRows = await db
    .select({
      participantId: participants.id,
      friendId: participants.friendId
    })
    .from(participants)
    .innerJoin(bills, eq(participants.billId, bills.id))
    .where(and(eq(bills.userId, authCheck.userId), inArray(participants.friendId, billIds)));

  const friendByParticipantId = new Map(
    participantRows
      .filter((row): row is { participantId: string; friendId: string } => Boolean(row.friendId))
      .map((row) => [row.participantId, row.friendId])
  );

  const unpaidPayments = await db
    .select({
      fromParticipantId: payments.fromParticipantId,
      toParticipantId: payments.toParticipantId,
      amountCents: payments.amountCents
    })
    .from(payments)
    .innerJoin(bills, eq(payments.billId, bills.id))
    .where(and(eq(bills.userId, authCheck.userId), eq(payments.isPaid, false)));

  const pendingByFriendId = new Map<string, { pendingCount: number; pendingAmountCents: number }>();
  for (const payment of unpaidPayments) {
    const fromFriendId = friendByParticipantId.get(payment.fromParticipantId);
    if (fromFriendId) {
      const current = pendingByFriendId.get(fromFriendId) ?? { pendingCount: 0, pendingAmountCents: 0 };
      pendingByFriendId.set(fromFriendId, {
        pendingCount: current.pendingCount + 1,
        pendingAmountCents: current.pendingAmountCents + payment.amountCents
      });
    }

    const toFriendId = friendByParticipantId.get(payment.toParticipantId);
    if (toFriendId) {
      const current = pendingByFriendId.get(toFriendId) ?? { pendingCount: 0, pendingAmountCents: 0 };
      pendingByFriendId.set(toFriendId, {
        pendingCount: current.pendingCount + 1,
        pendingAmountCents: current.pendingAmountCents + payment.amountCents
      });
    }
  }

  const usageByFriendId = new Map(
    usageRows
      .filter((row): row is { friendId: string; usageCount: number; lastUsedAt: string } => Boolean(row.friendId))
      .map((row) => [
        row.friendId,
        {
          usageCount: Number(row.usageCount ?? 0),
          lastUsedAt: row.lastUsedAt
        }
      ])
  );

  return jsonOk({
    friends: list.map((friend) => ({
      ...friend,
      usageCount: usageByFriendId.get(friend.id)?.usageCount ?? 0,
      lastUsedAt: usageByFriendId.get(friend.id)?.lastUsedAt ?? null,
      pendingCount: pendingByFriendId.get(friend.id)?.pendingCount ?? 0,
      pendingAmountCents: pendingByFriendId.get(friend.id)?.pendingAmountCents ?? 0
    }))
  });
}

export async function POST(req: NextRequest) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const body = await req.json().catch(() => null);
  const parsed = createFriendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const created = await db
    .insert(friends)
    .values({
      id: makeId("frd"),
      userId: authCheck.userId,
      name: parsed.data.name,
      color: parsed.data.color,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return jsonOk({ friend: created[0] }, 201);
}
