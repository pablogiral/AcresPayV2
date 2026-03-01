import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { auth } from "@/auth";
import { formatCurrency } from "@/lib/money";

export default async function MyBillsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const myBills = await db.query.bills.findMany({
    where: eq(bills.userId, session.user.id),
    orderBy: [desc(bills.date)]
  });

  return (
    <section className="card" style={{ display: "grid", gap: "0.7rem" }}>
      <h1 style={{ marginTop: 0 }}>Mis Tickets</h1>
      {myBills.length === 0 ? <p style={{ color: "#64748b" }}>Aún no tienes tickets.</p> : null}

      {myBills.map((bill) => (
        <Link key={bill.id} href={`/bill/${bill.id}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.7rem", display: "flex", justifyContent: "space-between", gap: "0.8rem" }}>
          <div>
            <strong>{bill.name}</strong>
            <p style={{ margin: 0, color: "#64748b" }}>{new Date(bill.date).toLocaleDateString("es-ES")}</p>
          </div>
          <strong>{formatCurrency(bill.totalCents)}</strong>
        </Link>
      ))}
    </section>
  );
}
