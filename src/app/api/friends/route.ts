import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { friends } from "@/lib/db/schema";
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

  return jsonOk({ friends: list });
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

  const existingColor = await db.query.friends.findFirst({
    where: and(eq(friends.userId, authCheck.userId), eq(friends.color, parsed.data.color))
  });

  if (existingColor) {
    return jsonError("Ese color ya está asignado a otro amigo", 409);
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
