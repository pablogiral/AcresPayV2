import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { friends, gangMembers, gangs } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateGangMembersSchema } from "@/lib/validators/gangs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const gang = await db.query.gangs.findFirst({
    where: and(eq(gangs.id, id), eq(gangs.userId, authCheck.userId))
  });

  if (!gang) {
    return jsonError("Pandilla no encontrada", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateGangMembersSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const uniqueFriendIds = [...new Set(parsed.data.friendIds)];
  if (uniqueFriendIds.length > 0) {
    const ownedFriends = await db.query.friends.findMany({
      where: and(eq(friends.userId, authCheck.userId), inArray(friends.id, uniqueFriendIds))
    });
    if (ownedFriends.length !== uniqueFriendIds.length) {
      return jsonError("Alguno de los amigos no existe o no te pertenece", 400);
    }
  }

  await db.delete(gangMembers).where(eq(gangMembers.gangId, id));
  if (uniqueFriendIds.length > 0) {
    await db.insert(gangMembers).values(
      uniqueFriendIds.map((friendId) => ({
        gangId: id,
        friendId,
        createdAt: new Date()
      }))
    );
  }

  return jsonOk({ ok: true });
}
