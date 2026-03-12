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
        <div className="page-intro">
          <p className="eyebrow">Historial</p>
          <h1 className="page-title">Tus cuentas, ordenadas por estado.</h1>
          <p className="page-copy">Lo importante aquí no es solo el importe. También si el ticket está listo, en pagos o ya cerrado.</p>
        </div>
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

      <div className="dashboard-tickets">
        {myBills.map((bill) => {
        const pendingPayments = bill.payments.filter((payment) => !payment.isPaid).length;
        const hasStructure = bill.participants.length > 0 && bill.lineItems.length > 0;
        const status = bill.isClosed
          ? "Cerrado"
          : !hasStructure
          ? "Borrador"
          : !bill.payerParticipantId
            ? "Falta pagador"
            : pendingPayments === 0 && bill.payments.length > 0
              ? "Liquidado"
              : bill.payments.length === 0
                ? "Listo para liquidar"
                : "En curso";

        return (
          <Link key={bill.id} href={`/bill/${bill.id}`} className={`card ticket-card ${bill.isClosed ? "ticket-closed-card" : ""}`}>
            <div className="ticket-card-main">
              <h2 className="ticket-card-title">{bill.name}</h2>
              <div className="ticket-card-meta">
                <span className="badge">{status}</span>
                <span className="subtle">{new Date(bill.date).toLocaleDateString("es-ES")}</span>
              </div>
              <div className="ticket-card-stats">
                <span>{bill.participants.length} participantes</span>
                <span>{bill.lineItems.length} items</span>
                {pendingPayments > 0 ? <span>{pendingPayments} pagos pendientes</span> : <span>Sin pagos pendientes</span>}
              </div>
            </div>
            <div className="ticket-card-total">
              <span className="subtle">Importe</span>
              <strong>{formatCurrency(bill.totalCents)}</strong>
            </div>
          </Link>
        );
      })}
      </div>
    </section>
  );
}
