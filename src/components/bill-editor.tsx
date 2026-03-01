"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FRIEND_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/money";

type Participant = {
  id: string;
  name: string;
  color: string;
};

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  isShared: boolean;
};

type Claim = {
  lineItemId: string;
  participantId: string;
  quantity: number;
  isShared: boolean;
};

type BillData = {
  id: string;
  name: string;
  totalCents: number;
  payerParticipantId: string | null;
  participants: Participant[];
  lineItems: LineItem[];
  claims: Claim[];
};

export function BillEditor({ initialBill }: { initialBill: BillData }) {
  const [bill, setBill] = useState(initialBill);
  const [participantName, setParticipantName] = useState("");
  const [participantColor, setParticipantColor] = useState<(typeof FRIEND_COLORS)[number]>(FRIEND_COLORS[0]);
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);
  const [itemShared, setItemShared] = useState(false);
  const router = useRouter();

  const claimsByKey = useMemo(() => {
    const map = new Map<string, Claim>();
    for (const c of bill.claims) {
      map.set(`${c.lineItemId}_${c.participantId}`, c);
    }
    return map;
  }, [bill.claims]);

  async function refresh() {
    const res = await fetch(`/api/bills/${bill.id}`);
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { bill: BillData };
    setBill(data.bill);
  }

  async function setBillNameOnBlur(value: string) {
    if (!value.trim() || value.trim() === bill.name) return;

    await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() })
    });

    await refresh();
  }

  async function setPayer(participantId: string) {
    await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payerParticipantId: participantId })
    });
    await refresh();
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/bills/${bill.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: participantName, color: participantColor })
    });
    setParticipantName("");
    await refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/bills/${bill.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: itemDescription,
        quantity: itemQuantity,
        unitPriceCents: itemUnitPrice,
        isShared: itemShared
      })
    });
    setItemDescription("");
    setItemQuantity(1);
    setItemUnitPrice(0);
    setItemShared(false);
    await refresh();
  }

  async function changeClaim(lineItemId: string, participantId: string, nextQuantity: number, isShared: boolean) {
    if (nextQuantity <= 0 && !isShared) {
      await fetch(`/api/items/${lineItemId}/claims/${participantId}`, { method: "DELETE" });
      await refresh();
      return;
    }

    await fetch(`/api/items/${lineItemId}/claims/${participantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Math.max(0, nextQuantity), isShared })
    });

    await refresh();
  }

  async function toggleShared(item: LineItem, value: boolean) {
    await fetch(`/api/items/${item.id}/shared`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShared: value })
    });
    await refresh();
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <div className="grid-auto">
          <label>
            <span>Nombre del ticket</span>
            <input className="input" defaultValue={bill.name} onBlur={(e) => void setBillNameOnBlur(e.target.value)} />
          </label>
          <div>
            <span>Total actual</span>
            <p style={{ marginTop: "0.5rem", marginBottom: 0, fontWeight: 700 }}>{formatCurrency(bill.totalCents)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Participantes</h2>
        <form className="grid-auto" onSubmit={addParticipant}>
          <input className="input" placeholder="Nombre" value={participantName} onChange={(e) => setParticipantName(e.target.value)} required />
          <select
            className="input"
            value={participantColor}
            onChange={(e) => setParticipantColor(e.target.value as (typeof FRIEND_COLORS)[number])}
          >
            {FRIEND_COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn" type="submit">Agregar participante</button>
        </form>

        <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.8rem" }}>
          {bill.participants.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="radio"
                name="payer"
                checked={bill.payerParticipantId === p.id}
                onChange={() => void setPayer(p.id)}
              />
              <span>{p.name}</span>
              <span className="badge">{p.color}</span>
              {bill.payerParticipantId === p.id ? <span className="badge">Paga inicialmente</span> : null}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Items</h2>
        <form className="grid-auto" onSubmit={addItem}>
          <input className="input" placeholder="Descripción" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} required />
          <input className="input" type="number" min={1} value={itemQuantity} onChange={(e) => setItemQuantity(Number(e.target.value))} required />
          <input className="input" type="number" min={0} value={itemUnitPrice} onChange={(e) => setItemUnitPrice(Number(e.target.value))} required />
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <input type="checkbox" checked={itemShared} onChange={(e) => setItemShared(e.target.checked)} />
            Compartido
          </label>
          <button className="btn" type="submit">Agregar item</button>
        </form>

        <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.8rem" }}>
          {bill.lineItems.map((item) => (
            <article key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.7rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
                <strong>{item.description}</strong>
                <span>{formatCurrency(item.totalPriceCents)}</span>
              </div>

              <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" }}>
                <input type="checkbox" checked={item.isShared} onChange={(e) => void toggleShared(item, e.target.checked)} />
                Item compartido
              </label>

              <div className="grid-auto" style={{ marginTop: "0.6rem" }}>
                {bill.participants.map((p) => {
                  const key = `${item.id}_${p.id}`;
                  const claim = claimsByKey.get(key);

                  if (item.isShared) {
                    return (
                      <label key={key} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(claim?.isShared)}
                          onChange={(e) => void changeClaim(item.id, p.id, e.target.checked ? 1 : 0, e.target.checked)}
                        />
                        {p.name}
                      </label>
                    );
                  }

                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ minWidth: 80 }}>{p.name}</span>
                      <button className="btn" type="button" onClick={() => void changeClaim(item.id, p.id, (claim?.quantity ?? 0) - 1, false)}>-</button>
                      <span>{claim?.quantity ?? 0}</span>
                      <button className="btn" type="button" onClick={() => void changeClaim(item.id, p.id, (claim?.quantity ?? 0) + 1, false)}>+</button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" type="button" onClick={() => router.push(`/settlement/${bill.id}`)}>
          Ver liquidación
        </button>
      </div>
    </section>
  );
}
