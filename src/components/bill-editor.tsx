"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColorChip } from "@/components/color-chip";
import { pickRandomFriendColor } from "@/lib/constants";
import { formatCurrency, parseCurrencyInput } from "@/lib/money";
import { calculateBillSettlement } from "@/lib/settlement";

type Participant = {
  id: string;
  friendId: string | null;
  name: string;
  color: string;
};

type SavedFriend = {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  lastUsedAt: string | null;
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
  const [savedFriends, setSavedFriends] = useState<SavedFriend[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [participantColor, setParticipantColor] = useState<string>(() => pickRandomFriendColor());
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState("0,00");
  const [itemShared, setItemShared] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  const claimsByKey = useMemo(() => {
    const map = new Map<string, Claim>();
    for (const c of bill.claims) {
      map.set(`${c.lineItemId}_${c.participantId}`, c);
    }
    return map;
  }, [bill.claims]);

  const itemState = useMemo(() => {
    return bill.lineItems.map((item) => {
      const itemClaims = bill.claims.filter((claim) => claim.lineItemId === item.id);
      if (item.isShared) {
        const selectedParticipants = itemClaims.filter((claim) => claim.isShared).length;
        return {
          itemId: item.id,
          coverageLabel:
            selectedParticipants === 0
              ? "Aún no has marcado quién comparte este item."
              : `Compartido entre ${selectedParticipants} participante${selectedParticipants === 1 ? "" : "s"}.`,
          isReady: selectedParticipants > 0
        };
      }

      const totalClaimed = itemClaims.reduce((acc, claim) => acc + claim.quantity, 0);
      if (totalClaimed === 0) {
        return {
          itemId: item.id,
          coverageLabel: "Aún no has asignado este item a nadie.",
          isReady: false
        };
      }

      if (totalClaimed < item.quantity) {
        return {
          itemId: item.id,
          coverageLabel: `Faltan ${item.quantity - totalClaimed} unidad${item.quantity - totalClaimed === 1 ? "" : "es"} por asignar.`,
          isReady: false
        };
      }

      if (totalClaimed > item.quantity) {
        return {
          itemId: item.id,
          coverageLabel: `Has asignado ${totalClaimed - item.quantity} unidad${totalClaimed - item.quantity === 1 ? "" : "es"} de más.`,
          isReady: false
        };
      }

      return {
        itemId: item.id,
        coverageLabel: "Asignación completa.",
        isReady: true
      };
    });
  }, [bill.claims, bill.lineItems]);

  const itemStateById = useMemo(
    () => new Map(itemState.map((entry) => [entry.itemId, entry])),
    [itemState]
  );

  const setupStatus = useMemo(() => {
    const missingPayer = !bill.payerParticipantId;
    const missingParticipants = bill.participants.length === 0;
    const missingItems = bill.lineItems.length === 0;
    const unresolvedItems = itemState.filter((entry) => !entry.isReady).length;
    const isReady = !missingPayer && !missingParticipants && !missingItems && unresolvedItems === 0;

    return {
      missingPayer,
      missingParticipants,
      missingItems,
      unresolvedItems,
      isReady
    };
  }, [bill.participants.length, bill.lineItems.length, bill.payerParticipantId, itemState]);

  const previewSettlement = useMemo(() => {
    if (!setupStatus.isReady || !bill.payerParticipantId) {
      return null;
    }

    return calculateBillSettlement({
      participants: bill.participants,
      lineItems: bill.lineItems,
      claims: bill.claims,
      payerParticipantId: bill.payerParticipantId
    });
  }, [bill.claims, bill.lineItems, bill.participants, bill.payerParticipantId, setupStatus.isReady]);

  const topTransfers = useMemo(() => {
    if (!previewSettlement) {
      return [];
    }

    return previewSettlement.transfers.slice(0, 3).map((transfer) => ({
      ...transfer,
      fromName: bill.participants.find((participant) => participant.id === transfer.fromParticipantId)?.name ?? "Alguien",
      toName: bill.participants.find((participant) => participant.id === transfer.toParticipantId)?.name ?? "Alguien"
    }));
  }, [bill.participants, previewSettlement]);

  useEffect(() => {
    void loadSavedFriends();
  }, []);

  async function refresh() {
    const res = await fetch(`/api/bills/${bill.id}`);
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { bill: BillData };
    setBill(data.bill);
  }

  async function loadSavedFriends() {
    const res = await fetch("/api/friends");
    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as { friends: SavedFriend[] };
    setSavedFriends(
      [...data.friends].sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }

        if (a.lastUsedAt && b.lastUsedAt) {
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
        }

        if (b.lastUsedAt) return 1;
        if (a.lastUsedAt) return -1;
        return a.name.localeCompare(b.name, "es");
      })
    );
  }

  async function setBillNameOnBlur(value: string) {
    if (!value.trim() || value.trim() === bill.name) return;
    setFeedback(null);

    const res = await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() })
    });

    if (!res.ok) {
      setFormError("No se pudo actualizar el nombre del ticket");
      return;
    }

    await refresh();
    setFeedback("Nombre del ticket actualizado");
  }

  async function setPayer(participantId: string) {
    setFormError(null);
    const res = await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payerParticipantId: participantId })
    });
    if (!res.ok) {
      setFormError("No se pudo cambiar quién paga inicialmente");
      return;
    }
    await refresh();
    setFeedback("Pagador inicial actualizado");
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);
    if (!participantName.trim()) {
      setFormError("Escribe un nombre para el participante");
      return;
    }

    const res = await fetch(`/api/bills/${bill.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: participantName, color: participantColor })
    });
    if (!res.ok) {
      setFormError("No se pudo añadir el participante");
      return;
    }
    setParticipantName("");
    setParticipantColor(pickRandomFriendColor(participantColor));
    await refresh();
    await loadSavedFriends();
    setFeedback("Participante añadido");
  }

  async function addSavedFriend(friend: SavedFriend) {
    setFormError(null);
    setFeedback(null);

    const res = await fetch(`/api/bills/${bill.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        friendId: friend.id,
        name: friend.name,
        color: friend.color
      })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setFormError(data?.message ?? "No se pudo añadir ese amigo al ticket");
      return;
    }

    await refresh();
    await loadSavedFriends();
    setFeedback(`${friend.name} añadido desde tus amigos`);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);
    if (!itemDescription.trim()) {
      setFormError("Añade una descripción para el item");
      return;
    }
    const unitPriceCents = parseCurrencyInput(itemUnitPrice);
    if (unitPriceCents === null) {
      setFormError("Introduce un precio válido, por ejemplo 12,50");
      return;
    }

    const res = await fetch(`/api/bills/${bill.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: itemDescription,
        quantity: itemQuantity,
        unitPriceCents,
        isShared: itemShared
      })
    });
    if (!res.ok) {
      setFormError("No se pudo añadir el item");
      return;
    }
    setItemDescription("");
    setItemQuantity(1);
    setItemUnitPrice("0,00");
    setItemShared(false);
    await refresh();
    setFeedback("Item añadido");
  }

  async function changeClaim(lineItemId: string, participantId: string, nextQuantity: number, isShared: boolean) {
    setFormError(null);
    if (nextQuantity <= 0 && !isShared) {
      await fetch(`/api/items/${lineItemId}/claims/${participantId}`, { method: "DELETE" });
      await refresh();
      setFeedback("Asignación actualizada");
      return;
    }

    await fetch(`/api/items/${lineItemId}/claims/${participantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Math.max(0, nextQuantity), isShared })
    });

    await refresh();
    setFeedback("Asignación actualizada");
  }

  async function toggleShared(item: LineItem, value: boolean) {
    setFormError(null);
    await fetch(`/api/items/${item.id}/shared`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShared: value })
    });
    await refresh();
    setFeedback("Modo de reparto actualizado");
  }

  function goToSettlement() {
    if (setupStatus.missingParticipants) {
      setFormError("Añade al menos un participante antes de liquidar");
      return;
    }

    if (setupStatus.missingItems) {
      setFormError("Añade al menos un item antes de liquidar");
      return;
    }

    if (setupStatus.missingPayer) {
      setFormError("Define quién pagó inicialmente antes de liquidar");
      return;
    }

    if (setupStatus.unresolvedItems > 0) {
      setFormError("Revisa los items pendientes de asignación antes de liquidar");
      return;
    }

    router.push(`/settlement/${bill.id}`);
  }

  return (
    <section className="page-stack">
      <div className="card card-hero">
        <div className="inline-row" style={{ marginBottom: "0.9rem" }}>
          <span className="badge">1. Configura</span>
          <span className="badge">2. Reparte</span>
          <span className="badge">3. Revisa</span>
        </div>

        <div className="grid-auto">
          <label className="field-stack">
            <span>Nombre del ticket</span>
            <input className="input" defaultValue={bill.name} onBlur={(e) => void setBillNameOnBlur(e.target.value)} />
          </label>
          <div className="money-panel">
            <span className="subtle">Total actual</span>
            <p style={{ marginTop: "0.35rem", marginBottom: 0, fontWeight: 800, fontSize: "1.45rem" }}>{formatCurrency(bill.totalCents)}</p>
          </div>
        </div>
        {feedback ? <p className="subtle" style={{ marginTop: "0.75rem", color: "var(--accent-strong)" }}>{feedback}</p> : null}
      </div>

      <div className="grid-auto" style={{ alignItems: "start" }}>
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <div>
            <p className="eyebrow">Estado del ticket</p>
            <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Antes de liquidar</h2>
            <p className="subtle">Aquí ves si el ticket ya está listo o qué te falta por resolver.</p>
          </div>

          <div className="grid-auto">
            <div className="panel-row">
              <strong>{bill.participants.length}</strong>
              <span className="subtle">Participantes</span>
            </div>
            <div className="panel-row">
              <strong>{bill.lineItems.length}</strong>
              <span className="subtle">Items</span>
            </div>
            <div className="panel-row">
              <strong>{setupStatus.unresolvedItems}</strong>
              <span className="subtle">Items pendientes</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            {setupStatus.missingParticipants ? <p className="subtle">Te falta añadir al menos un participante.</p> : null}
            {setupStatus.missingItems ? <p className="subtle">Todavía no has añadido ningún item.</p> : null}
            {setupStatus.missingPayer ? <p className="subtle">Aún no has indicado quién pagó inicialmente.</p> : null}
            {!setupStatus.missingItems && setupStatus.unresolvedItems > 0 ? (
              <p className="subtle">Hay {setupStatus.unresolvedItems} item(s) con reparto incompleto.</p>
            ) : null}
            {setupStatus.isReady ? <p className="subtle" style={{ color: "var(--accent-strong)" }}>Listo para calcular la liquidación.</p> : null}
          </div>

          {previewSettlement ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <p className="eyebrow">Vista previa de pagos</p>
              {topTransfers.length > 0 ? topTransfers.map((transfer, index) => (
                <div key={index} className="inline-row" style={{ justifyContent: "space-between" }}>
                  <span className="subtle">{transfer.fromName} → {transfer.toName}</span>
                  <strong>{formatCurrency(transfer.amountCents)}</strong>
                </div>
              )) : <p className="subtle">No hay pagos pendientes.</p>}
            </div>
          ) : null}
        </div>

        <div className="page-stack">
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow">Paso 1</p>
                <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Participantes</h2>
                <p className="subtle">Añade a todos los que estuvieron. Puedes tirar de tus amigos guardados o crear a alguien al vuelo.</p>
              </div>
            </div>
            <div style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
              <p className="subtle">Tus amigos frecuentes</p>
              <div className="saved-friends-grid">
                {savedFriends.length === 0 ? <p className="subtle">Aún no tienes amigos guardados para reutilizar.</p> : null}
                {savedFriends.slice(0, 8).map((friend) => {
                  const alreadyAdded = bill.participants.some((participant) => participant.friendId === friend.id);

                  return (
                    <button
                      key={friend.id}
                      className="saved-friend-card"
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => void addSavedFriend(friend)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                        <strong>{friend.name}</strong>
                        <ColorChip color={friend.color} />
                      </div>
                      <span className="subtle" style={{ textAlign: "left" }}>
                        {alreadyAdded
                          ? "Ya está en este ticket"
                          : friend.usageCount > 0
                            ? `Usado ${friend.usageCount} vez${friend.usageCount === 1 ? "" : "es"}`
                            : "Disponible para reutilizar"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <form className="grid-auto" onSubmit={addParticipant}>
              <input className="input" placeholder="Nombre" value={participantName} onChange={(e) => setParticipantName(e.target.value)} required />
              <div className="inline-row">
                <ColorChip color={participantColor} label="Color" />
                <button className="btn" type="button" onClick={() => setParticipantColor(pickRandomFriendColor(participantColor))}>
                  Otro tono
                </button>
              </div>
              <button className="btn" type="submit">Agregar participante</button>
            </form>

            <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.8rem" }}>
              {bill.participants.length === 0 ? (
                <div className="section-empty">
                  <strong>Todavía no hay participantes.</strong>
                  <p className="subtle">Empieza por añadir a quienes compartieron este ticket y marca quién adelantó el pago cuando aparezcan aquí.</p>
                </div>
              ) : null}
              {bill.participants.map((p) => (
                <label key={p.id} className="participant-row">
                  <input
                    type="radio"
                    name="payer"
                    checked={bill.payerParticipantId === p.id}
                    onChange={() => void setPayer(p.id)}
                  />
                  <span>{p.name}</span>
                  <ColorChip color={p.color} />
                  {p.friendId ? <span className="badge">Guardado</span> : null}
                  {bill.payerParticipantId === p.id ? <span className="badge">Paga inicialmente</span> : null}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow">Paso 2</p>
                <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Items y reparto</h2>
                <p className="subtle">Añade cada consumo y decide si se reparte por unidades o si es compartido entre varias personas.</p>
              </div>
            </div>
            <form className="grid-auto" onSubmit={addItem}>
              <input className="input" placeholder="Descripción" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} required />
              <input className="input" type="number" min={1} value={itemQuantity} onChange={(e) => setItemQuantity(Number(e.target.value))} required />
              <input
                className="input"
                inputMode="decimal"
                placeholder="12,50"
                value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(e.target.value)}
                required
              />
              <label className="inline-row">
                <input type="checkbox" checked={itemShared} onChange={(e) => setItemShared(e.target.checked)} />
                Compartido
              </label>
              <button className="btn" type="submit">Agregar item</button>
            </form>
            {formError ? <p className="error-text" style={{ marginTop: "0.75rem" }}>{formError}</p> : null}

            <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.8rem" }}>
              {bill.lineItems.length === 0 ? (
                <div className="section-empty">
                  <strong>Todavía no hay items.</strong>
                  <p className="subtle">Añade cada consumo con su precio. El importe admite decimales, por ejemplo 12,50.</p>
                </div>
              ) : null}
              {bill.lineItems.map((item) => (
                <article key={item.id} className="panel-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
                    <strong>{item.description}</strong>
                    <span>{formatCurrency(item.totalPriceCents)}</span>
                  </div>

                  <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" }}>
                    <input type="checkbox" checked={item.isShared} onChange={(e) => void toggleShared(item, e.target.checked)} />
                    Item compartido
                  </label>

                  <p className="subtle">{itemStateById.get(item.id)?.coverageLabel}</p>

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
                        <div key={key} className="claim-stepper">
                          <span className="claim-stepper-label">{p.name}</span>
                          <div className="inline-row">
                            <button className="btn" type="button" onClick={() => void changeClaim(item.id, p.id, (claim?.quantity ?? 0) - 1, false)}>-</button>
                            <span className="badge">{claim?.quantity ?? 0} ud</span>
                            <button className="btn" type="button" onClick={() => void changeClaim(item.id, p.id, (claim?.quantity ?? 0) + 1, false)}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" type="button" onClick={goToSettlement}>
          Ver liquidación
        </button>
      </div>
    </section>
  );
}
