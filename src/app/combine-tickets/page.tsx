import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { CombineTicketsClient } from "@/components/combine-tickets-client";

export default async function CombineTicketsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const myBills = await db.query.bills.findMany({
    where: eq(bills.userId, session.user.id),
    orderBy: [desc(bills.date)]
  });

  return <CombineTicketsClient bills={myBills.map((b) => ({ id: b.id, name: b.name, totalCents: b.totalCents, date: b.date.toISOString() }))} />;
}
