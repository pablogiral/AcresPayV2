import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { gangs } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { updateGangSchema } from "@/lib/validators/gangs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateGangSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const [updated] = await db
    .update(gangs)
    .set({
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      updatedAt: new Date()
    })
    .where(and(eq(gangs.id, id), eq(gangs.userId, authCheck.userId)))
    .returning();

  if (!updated) {
    return jsonError("Pandilla no encontrada", 404);
  }

  return jsonOk({ gang: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const { id } = await params;
  const deleted = await db
    .delete(gangs)
    .where(and(eq(gangs.id, id), eq(gangs.userId, authCheck.userId)))
    .returning();

  if (!deleted[0]) {
    return jsonError("Pandilla no encontrada", 404);
  }

  return jsonOk({ ok: true });
}
