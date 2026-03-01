import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, participants } from "@/lib/db/schema";
import { jsonOk, requireUserId } from "@/lib/api";

export async function GET() {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const list = await db.query.bills.findMany({
    where: eq(bills.userId, authCheck.userId),
    orderBy: [desc(bills.date)],
    with: {
      participants: {
        orderBy: [asc(participants.createdAt)]
      }
    }
  });

  return jsonOk({ bills: list });
}
