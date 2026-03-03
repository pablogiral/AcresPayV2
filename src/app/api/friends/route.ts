import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, friends, participants } from "@/lib/db/schema";
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
      lastUsedAt: usageByFriendId.get(friend.id)?.lastUsedAt ?? null
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
