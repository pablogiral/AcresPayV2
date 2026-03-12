"use client";

import { useMemo, useState } from "react";
import { calculateBillSettlement } from "@/lib/settlement";
import { formatCurrency } from "@/lib/money";

type Participant = {
  id: string;
  name: string;
};

type BillPayload = {
  id: string;
  isClosed: boolean;
  payerParticipantId: string | null;
  participants: Participant[];
  lineItems: Array<{ id: string; totalPriceCents: number; isShared: boolean }>;
  claims: Array<{ lineItemId: string; participantId: string; quantity: number; isShared: boolean }>;
  payments: Array<{ id: string; fromParticipantId: string; toParticipantId: string; amountCents: number; isPaid: boolean }>;
};

export function SettlementClient({ bill }: { bill: BillPayload }) {
  const [payments, setPayments] = useState(bill.payments);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bulkUndoTransfers, setBulkUndoTransfers] = useState<Array<{ fromParticipantId: string; toParticipantId: string; amountCents: number }>>([]);
  const [isClosed, setIsClosed] = useState(bill.isClosed);

  const participantById = useMemo(() => new Map(bill.participants.map((p) => [p.id, p])), [bill.participants]);

  const settlement = useMemo(() => {
    if (!bill.payerParticipantId) return null;

    return calculateBillSettlement({
      participants: bill.participants,
      lineItems: bill.lineItems,
      claims: bill.claims,
      payerParticipantId: bill.payerParticipantId
    });
  }, [bill]);

  const mergedTransfers = useMemo(() => {
    if (!settlement) return [];

    return settlement.transfers.map((t) => {
      const existing = payments.find(
        (p) =>
          p.fromParticipantId === t.fromParticipantId &&
          p.toParticipantId === t.toParticipantId &&
          p.amountCents === t.amountCents
      );

      return {
        ...t,
        isPaid: existing?.isPaid ?? false
      };
    });
  }, [settlement, payments]);

  const allPaid = mergedTransfers.every((t) => t.isPaid);
  const pendingTransfers = mergedTransfers.filter((transfer) => !transfer.isPaid);
  const completedTransfers = mergedTransfers.filter((transfer) => transfer.isPaid);
  const nextTransfer = pendingTransfers[0] ?? null;

  async function togglePayment(transfer: { fromParticipantId: string; toParticipantId: string; amountCents: number; isPaid: boolean }) {
    if (isClosed) {
      setFeedback("El ticket está cerrado. Reábrelo para modificar pagos.");
      return;
    }
    const res = await fetch(`/api/bills/${bill.id}/payments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        amountCents: transfer.amountCents,
        isPaid: !transfer.isPaid
      })
    });

    if (!res.ok) return;

    const data = (await res.json()) as {
      payment: {
        id: string;
        fromParticipantId: string;
        toParticipantId: string;
        amountCents: number;
        isPaid: boolean;
      };
    };

    setPayments((prev) => {
      const idx = prev.findIndex((p) => p.id === data.payment.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data.payment;
        return next;
      }
      return [...prev, data.payment];
    });
  }

  async function markAllPendingAsPaid() {
    if (pendingTransfers.length === 0) {
      return;
    }

    setFeedback(null);
    setBulkUndoTransfers(
      pendingTransfers.map((transfer) => ({
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        amountCents: transfer.amountCents
      }))
    );

    for (const transfer of pendingTransfers) {
      await togglePayment(transfer);
    }

    setFeedback("Todos los pagos pendientes quedaron marcados como realizados.");
  }

  async function undoMarkAllPaid() {
    const transfersToUndo = [...bulkUndoTransfers];
    if (transfersToUndo.length === 0) {
      return;
    }

    for (const transfer of transfersToUndo) {
      await togglePayment({
        ...transfer,
        isPaid: true
      });
    }

    setBulkUndoTransfers([]);
    setFeedback("Se han vuelto a dejar pendientes esos pagos.");
  }

  async function copyTransferMessage(transfer: { fromParticipantId: string; toParticipantId: string; amountCents: number }) {
    const fromName = participantById.get(transfer.fromParticipantId)?.name ?? "Alguien";
    const toName = participantById.get(transfer.toParticipantId)?.name ?? "Alguien";
    const message = `${fromName} le paga ${formatCurrency(transfer.amountCents)} a ${toName}.`;

    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Texto copiado para compartir el pago.");
    } catch {
      setFeedback(`Copia este texto: ${message}`);
    }
  }

  async function copyAllPendingPayments() {
    const lines = pendingTransfers.map((transfer) => {
      const fromName = participantById.get(transfer.fromParticipantId)?.name ?? "Alguien";
      const toName = participantById.get(transfer.toParticipantId)?.name ?? "Alguien";
      return `- ${fromName} paga ${formatCurrency(transfer.amountCents)} a ${toName}`;
    });
    const message = lines.length > 0
      ? `Pagos pendientes:\n${lines.join("\n")}`
      : "No quedan pagos pendientes.";

    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Resumen completo de pagos copiado.");
    } catch {
      setFeedback(`Copia este texto:\n${message}`);
    }
  }

  async function toggleClosed(nextClosed: boolean) {
    const res = await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: nextClosed })
    });
    if (!res.ok) {
      setFeedback("No se pudo actualizar el estado del ticket.");
      return;
    }
    setIsClosed(nextClosed);
    setFeedback(nextClosed ? "Ticket cerrado correctamente." : "Ticket reabierto.");
  }

  if (!bill.payerParticipantId) {
    return <section className="card"><p className="subtle">Debes definir quién paga inicialmente en el ticket.</p></section>;
  }

  return (
    <section className="settlement-shell">
      <div className="card card-hero">
        <div className="page-intro">
          <p className="eyebrow">Liquidación</p>
          <h1 className="page-title">Convierte el reparto en acciones claras.</h1>
          <p className="page-copy">Aquí no importa revisar cálculos, sino saber quién paga, cuánto queda y cuándo puedes cerrar el ticket.</p>
        </div>
        <div className="ticket-card-meta" style={{ marginTop: "0.9rem" }}>
          {allPaid ? <span className="badge badge-center">Todo pagado</span> : null}
          {isClosed ? <span className="badge badge-center">Ticket cerrado</span> : null}
        </div>
      </div>

      <div className="editorial-grid">
        <div className="settlement-shell">
          {nextTransfer ? (
            <div className="card section-empty">
              <p className="eyebrow">Siguiente paso</p>
              <strong style={{ fontSize: "1.2rem" }}>
                {participantById.get(nextTransfer.fromParticipantId)?.name} paga a {participantById.get(nextTransfer.toParticipantId)?.name}
              </strong>
              <p className="page-copy" style={{ maxWidth: "none", fontSize: "0.98rem" }}>{formatCurrency(nextTransfer.amountCents)}</p>
              <div className="action-bar">
                <button className="btn btn-primary" type="button" onClick={() => void togglePayment(nextTransfer)}>
                  Marcar este pago
                </button>
                <button className="btn" type="button" onClick={() => void copyTransferMessage(nextTransfer)}>
                  Copiar texto
                </button>
              </div>
            </div>
          ) : (
            <div className="card section-empty">
              <strong>No quedan pagos pendientes.</strong>
              <p className="subtle">Puedes cerrar el ticket o reabrirlo más adelante si hiciera falta.</p>
            </div>
          )}

          <div className="card settlement-section">
            <div className="action-bar">
              <div>
                <p className="eyebrow">Pendientes</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Pagos por resolver</h2>
              </div>
              <button className="btn" type="button" onClick={() => void copyAllPendingPayments()}>
                Copiar todos
              </button>
            </div>
            <div className="muted-divider" />
            {pendingTransfers.length > 0 ? (
              <div className="settlement-list">
                {pendingTransfers.map((transfer, idx) => (
                  <div key={idx} className="panel-row settlement-row">
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {participantById.get(transfer.fromParticipantId)?.name} le paga a {participantById.get(transfer.toParticipantId)?.name}
                      </div>
                      <strong style={{ display: "inline-block", marginTop: "0.4rem", fontSize: "1.1rem" }}>{formatCurrency(transfer.amountCents)}</strong>
                    </div>
                    <div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
                      <label className="inline-row">
                        <input type="checkbox" checked={transfer.isPaid} onChange={() => void togglePayment(transfer)} />
                        <span className="subtle">Pagado</span>
                      </label>
                      <button className="btn" type="button" onClick={() => void copyTransferMessage(transfer)}>
                        Copiar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="subtle">No quedan pagos pendientes.</p>
            )}
            {!allPaid && pendingTransfers.length > 1 ? (
              <div className="action-bar">
                <button className="btn" type="button" disabled={isClosed} onClick={() => void markAllPendingAsPaid()}>
                  Marcar todos como pagados
                </button>
                {bulkUndoTransfers.length > 0 ? (
                  <button className="btn" type="button" onClick={() => void undoMarkAllPaid()}>
                    Deshacer
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {completedTransfers.length > 0 ? (
            <div className="card settlement-section">
              <div>
                <p className="eyebrow">Historial</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Pagos ya realizados</h2>
              </div>
              <div className="muted-divider" />
              <div className="settlement-list">
                {completedTransfers.map((transfer, idx) => (
                  <div key={idx} className="panel-row settlement-row" style={{ opacity: 0.76 }}>
                    <div>
                      <div style={{ textDecoration: "line-through", fontWeight: 700 }}>
                        {participantById.get(transfer.fromParticipantId)?.name} le pagó a {participantById.get(transfer.toParticipantId)?.name}
                      </div>
                      <strong style={{ display: "inline-block", marginTop: "0.4rem" }}>{formatCurrency(transfer.amountCents)}</strong>
                    </div>
                    <div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
                      <span className="badge badge-center">Pagado</span>
                      <label className="inline-row">
                        <input type="checkbox" checked={true} disabled={isClosed} onChange={() => void togglePayment({ ...transfer, isPaid: true })} />
                        <span className="subtle">Revertir</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="settlement-shell">
          <div className="card settlement-section">
            <p className="eyebrow">Estado</p>
            <div className="grid-auto">
              <div className="panel-row">
                <strong>{mergedTransfers.length}</strong>
                <span className="subtle">Pagos totales</span>
              </div>
              <div className="panel-row">
                <strong>{pendingTransfers.length}</strong>
                <span className="subtle">Pendientes</span>
              </div>
              <div className="panel-row">
                <strong>{completedTransfers.length}</strong>
                <span className="subtle">Completados</span>
              </div>
            </div>
            <div className="muted-divider" />
            <div className="action-bar">
              {allPaid ? (
                <button className="btn btn-primary" type="button" onClick={() => void toggleClosed(!isClosed)}>
                  {isClosed ? "Reabrir ticket" : "Cerrar ticket"}
                </button>
              ) : (
                <p className="subtle">Cuando todos los pagos estén completos podrás cerrar el ticket.</p>
              )}
            </div>
          </div>

          {feedback ? (
            <div className="card feature-note">
              <p className="eyebrow">Acción</p>
              <p className="subtle" style={{ color: "var(--accent-strong)" }}>{feedback}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
