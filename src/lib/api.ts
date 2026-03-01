import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "No autenticado" }, { status: 401 }) };
  }

  return { userId: session.user.id };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}
