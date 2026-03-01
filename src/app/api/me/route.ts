import { auth } from "@/auth";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const session = await auth();
  return jsonOk({ user: session?.user ?? null });
}
