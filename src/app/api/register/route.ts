import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { makeId } from "@/lib/id";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email)
  });

  if (existing) {
    return jsonError("Ya existe una cuenta con ese email", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.insert(users).values({
    id: makeId("usr"),
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return jsonOk({ ok: true }, 201);
}
