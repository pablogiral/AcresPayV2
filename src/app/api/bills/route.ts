import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { makeId } from "@/lib/id";
import { createBillSchema } from "@/lib/validators/bills";

export async function POST(req: NextRequest) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const body = await req.json().catch(() => null);
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const created = await db
    .insert(bills)
    .values({
      id: makeId("bil"),
      userId: authCheck.userId,
      name: parsed.data.name,
      date: new Date(),
      totalCents: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return jsonOk({ bill: created[0] }, 201);
}
