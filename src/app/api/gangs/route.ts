import { and, asc, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { friends, gangMembers, gangs } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { createGangSchema } from "@/lib/validators/gangs";

export async function GET() {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const list = await db.query.gangs.findMany({
    where: eq(gangs.userId, authCheck.userId),
    orderBy: [asc(gangs.createdAt)]
  });

  if (list.length === 0) {
    return jsonOk({ gangs: [] });
  }

  const members = await db
    .select({
      gangId: gangMembers.gangId,
      friendId: gangMembers.friendId
    })
    .from(gangMembers)
    .innerJoin(friends, eq(gangMembers.friendId, friends.id))
    .where(
      and(
        inArray(
          gangMembers.gangId,
          list.map((gang) => gang.id)
        ),
        eq(friends.userId, authCheck.userId)
      )
    );

  const memberIdsByGang = new Map<string, string[]>();
  for (const row of members) {
    const current = memberIdsByGang.get(row.gangId) ?? [];
    current.push(row.friendId);
    memberIdsByGang.set(row.gangId, current);
  }

  return jsonOk({
    gangs: list.map((gang) => ({
      ...gang,
      friendIds: memberIdsByGang.get(gang.id) ?? []
    }))
  });
}

export async function POST(req: NextRequest) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const body = await req.json().catch(() => null);
  const parsed = createGangSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const [created] = await db
    .insert(gangs)
    .values({
      id: makeId("gng"),
      userId: authCheck.userId,
      name: parsed.data.name,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return jsonOk({ gang: { ...created, friendIds: [] } }, 201);
}
