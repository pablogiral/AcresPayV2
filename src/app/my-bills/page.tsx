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
    orderBy: [desc(bills.date)],
    with: {
      participants: true,
      lineItems: true,
      payments: true
    }
  });

  return (
    <section className="page-stack">
      <div className="card card-hero">
        <p className="eyebrow">Historial</p>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Mis Tickets</h1>
        <p className="subtle">Reabre, corrige y liquida cualquier cuenta anterior.</p>
      </div>
      {myBills.length === 0 ? (
        <div className="card section-empty">
          <strong>Aún no tienes tickets.</strong>
          <p className="subtle">Cuando crees el primero, aquí verás su estado, lo que falta por hacer y si ya quedó liquidado.</p>
          <div>
            <Link href="/bill/new" className="btn btn-primary">Crear mi primer ticket</Link>
          </div>
        </div>
      ) : null}

      {myBills.map((bill) => {
        const pendingPayments = bill.payments.filter((payment) => !payment.isPaid).length;
        const hasStructure = bill.participants.length > 0 && bill.lineItems.length > 0;
        const status = !hasStructure
          ? "Borrador"
          : !bill.payerParticipantId
            ? "Falta pagador"
            : pendingPayments === 0 && bill.payments.length > 0
              ? "Liquidado"
              : bill.payments.length === 0
                ? "Listo para liquidar"
                : "En curso";

        return (
          <Link key={bill.id} href={`/bill/${bill.id}`} className="card list-link">
            <div>
              <strong>{bill.name}</strong>
              <p className="subtle" style={{ marginTop: "0.25rem" }}>{new Date(bill.date).toLocaleDateString("es-ES")}</p>
              <div className="inline-row" style={{ marginTop: "0.55rem" }}>
                <span className="badge">{status}</span>
                <span className="subtle">{bill.participants.length} participantes</span>
                <span className="subtle">{bill.lineItems.length} items</span>
                {pendingPayments > 0 ? <span className="subtle">{pendingPayments} pagos pendientes</span> : null}
              </div>
            </div>
            <strong>{formatCurrency(bill.totalCents)}</strong>
          </Link>
        );
      })}
    </section>
  );
}
