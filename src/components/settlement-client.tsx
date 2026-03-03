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

  const allPaid = mergedTransfers.length > 0 && mergedTransfers.every((t) => t.isPaid);
  const pendingTransfers = mergedTransfers.filter((transfer) => !transfer.isPaid);
  const completedTransfers = mergedTransfers.filter((transfer) => transfer.isPaid);
  const nextTransfer = pendingTransfers[0] ?? null;

  async function togglePayment(transfer: { fromParticipantId: string; toParticipantId: string; amountCents: number; isPaid: boolean }) {
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

  if (!bill.payerParticipantId) {
    return <section className="card"><p className="subtle">Debes definir quién paga inicialmente en el ticket.</p></section>;
  }

  return (
    <section className="card card-hero">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Cierre</p>
          <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Liquidación</h1>
          <p className="subtle">Marca pagos hechos, comparte el siguiente pago y deja el cierre listo sin dudas.</p>
        </div>
        {allPaid ? <p className="badge">Todo pagado</p> : null}
      </div>

      <div className="grid-auto" style={{ marginTop: "1rem" }}>
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

      {feedback ? <p className="subtle" style={{ color: "var(--accent-strong)" }}>{feedback}</p> : null}

      {nextTransfer ? (
        <div className="section-empty" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Siguiente paso recomendado</p>
          <strong>
            {participantById.get(nextTransfer.fromParticipantId)?.name} le paga a {participantById.get(nextTransfer.toParticipantId)?.name}
          </strong>
          <p className="subtle">{formatCurrency(nextTransfer.amountCents)}</p>
          <div className="action-bar">
            <button className="btn btn-primary" type="button" onClick={() => void togglePayment(nextTransfer)}>
              Marcar este pago
            </button>
            <button className="btn" type="button" onClick={() => void copyTransferMessage(nextTransfer)}>
              Copiar texto
            </button>
          </div>
        </div>
      ) : null}

      {!allPaid && pendingTransfers.length > 1 ? (
        <div className="action-bar" style={{ marginTop: "1rem" }}>
          <button className="btn" type="button" onClick={() => void markAllPendingAsPaid()}>
            Marcar pagos pendientes como realizados
          </button>
          {bulkUndoTransfers.length > 0 ? (
            <button className="btn" type="button" onClick={() => void undoMarkAllPaid()}>
              Deshacer último marcado masivo
            </button>
          ) : null}
        </div>
      ) : null}

      {pendingTransfers.length === 0 ? (
        <div className="section-empty" style={{ marginTop: "1rem" }}>
          <strong>No quedan pagos pendientes.</strong>
          <p className="subtle">Ya puedes cerrar este ticket o compartir el historial como referencia.</p>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        {pendingTransfers.map((transfer, idx) => (
          <div key={idx} className="panel-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <div style={{ textDecoration: transfer.isPaid ? "line-through" : "none", fontWeight: 700 }}>
                {participantById.get(transfer.fromParticipantId)?.name} le paga a {participantById.get(transfer.toParticipantId)?.name}
              </div>
              <strong style={{ display: "inline-block", marginTop: "0.35rem" }}>{formatCurrency(transfer.amountCents)}</strong>
              <p className="subtle" style={{ marginTop: "0.35rem" }}>Puedes copiar este texto y mandarlo por WhatsApp o mensaje.</p>
            </div>
            <div style={{ display: "grid", gap: "0.55rem", justifyItems: "end" }}>
              <input type="checkbox" checked={transfer.isPaid} onChange={() => void togglePayment(transfer)} />
              <button className="btn" type="button" onClick={() => void copyTransferMessage(transfer)}>
                Copiar
              </button>
            </div>
          </div>
        ))}
      </div>

      {completedTransfers.length > 0 ? (
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <p className="eyebrow">Historial</p>
          {completedTransfers.map((transfer, idx) => (
            <div key={idx} className="panel-row" style={{ gridTemplateColumns: "1fr auto", opacity: 0.72 }}>
              <div>
                <div style={{ textDecoration: "line-through", fontWeight: 700 }}>
                  {participantById.get(transfer.fromParticipantId)?.name} le pagó a {participantById.get(transfer.toParticipantId)?.name}
                </div>
                <strong style={{ display: "inline-block", marginTop: "0.35rem" }}>{formatCurrency(transfer.amountCents)}</strong>
              </div>
              <span className="badge">Pagado</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
