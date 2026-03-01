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

  if (!bill.payerParticipantId) {
    return <section className="card"><p>Debes definir quién paga inicialmente en el ticket.</p></section>;
  }

  return (
    <section className="card">
      <h1 style={{ marginTop: 0 }}>Liquidación</h1>
      {allPaid ? <p className="badge">¡Todo Pagado!</p> : null}

      <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
        {mergedTransfers.map((transfer, idx) => (
          <label key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.7rem", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.7rem" }}>
            <div>
              <div style={{ textDecoration: transfer.isPaid ? "line-through" : "none" }}>
                {participantById.get(transfer.fromParticipantId)?.name} le paga a {participantById.get(transfer.toParticipantId)?.name}
              </div>
              <strong>{formatCurrency(transfer.amountCents)}</strong>
            </div>
            <input type="checkbox" checked={transfer.isPaid} onChange={() => void togglePayment(transfer)} />
          </label>
        ))}
      </div>
    </section>
  );
}
