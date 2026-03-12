"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColorChip, getReadableTextColor } from "@/components/color-chip";
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

type Gang = {
  id: string;
  name: string;
  friendIds: string[];
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
  isClosed: boolean;
  totalCents: number;
  payerParticipantId: string | null;
  participants: Participant[];
  lineItems: LineItem[];
  claims: Claim[];
};

export function BillEditor({ initialBill }: { initialBill: BillData }) {
  const [bill, setBill] = useState(initialBill);
  const [savedFriends, setSavedFriends] = useState<SavedFriend[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [selectedGangId, setSelectedGangId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantColor, setParticipantColor] = useState<string>(() => pickRandomFriendColor());
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemTotalPrice, setItemTotalPrice] = useState("0,00");
  const [itemShared, setItemShared] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(true);
  const [openSections, setOpenSections] = useState({
    basics: true,
    participants: true,
    items: true
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemDescription, setEditingItemDescription] = useState("");
  const [editingItemQuantity, setEditingItemQuantity] = useState(1);
  const [editingItemTotalPrice, setEditingItemTotalPrice] = useState("0,00");
  const [editingItemShared, setEditingItemShared] = useState(false);
  const [claimDrafts, setClaimDrafts] = useState<Record<string, string>>({});
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
    void loadGangs();
  }, []);

  useEffect(() => {
    setBill(initialBill);
    setFormError(null);
    setFeedback(null);
    setEditingItemId(null);
    setIsSummaryVisible(true);
    setOpenSections({
      basics: true,
      participants: true,
      items: true
    });
    setClaimDrafts({});
  }, [initialBill]);

  function toggleSection(key: "basics" | "participants" | "items") {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

  async function loadGangs() {
    const res = await fetch("/api/gangs");
    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as { gangs: Gang[] };
    setGangs(data.gangs);
  }

  async function setBillNameOnBlur(value: string) {
    if (bill.isClosed) return;
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
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
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
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
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
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
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
    await loadGangs();
    setFeedback(`${friend.name} añadido desde tus amigos`);
  }

  async function addGangParticipants() {
    if (!selectedGangId) {
      setFormError("Selecciona una pandilla");
      return;
    }
    const res = await fetch(`/api/bills/${bill.id}/participants/from-gang`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gangId: selectedGangId })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setFormError(data?.message ?? "No se pudieron añadir los amigos de la pandilla");
      return;
    }

    const data = (await res.json()) as { addedCount: number };
    await refresh();
    await loadSavedFriends();
    setFeedback(
      data.addedCount > 0
        ? `Se añadieron ${data.addedCount} participantes desde la pandilla`
        : "Todos los amigos de esa pandilla ya estaban en el ticket"
    );
  }

  async function saveParticipantAsFriend(participant: Participant) {
    setFormError(null);
    setFeedback(null);

    const existingFriend = savedFriends.find(
      (friend) => friend.name.trim().toLowerCase() === participant.name.trim().toLowerCase()
    );

    let friendId = existingFriend?.id;
    if (!friendId) {
      const createRes = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: participant.name, color: participant.color })
      });

      if (!createRes.ok) {
        setFormError("No se pudo guardar este participante como amigo");
        return;
      }

      const created = (await createRes.json()) as { friend: { id: string } };
      friendId = created.friend.id;
    }

    const linkRes = await fetch(`/api/participants/${participant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId })
    });

    if (!linkRes.ok) {
      setFormError("No se pudo vincular el amigo al ticket");
      return;
    }

    await refresh();
    await loadSavedFriends();
    setFeedback(`${participant.name} ya está guardado en tus amigos`);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
    setFormError(null);
    setFeedback(null);
    if (!itemDescription.trim()) {
      setFormError("Añade una descripción para el item");
      return;
    }
    const totalPriceCents = parseCurrencyInput(itemTotalPrice);
    if (totalPriceCents === null) {
      setFormError("Introduce un precio válido");
      return;
    }

    const res = await fetch(`/api/bills/${bill.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: itemDescription,
        quantity: itemQuantity,
        totalPriceCents,
        isShared: itemShared
      })
    });
    if (!res.ok) {
      setFormError("No se pudo añadir el item");
      return;
    }
    setItemDescription("");
    setItemQuantity(1);
    setItemTotalPrice("0,00");
    setItemShared(false);
    await refresh();
    setFeedback("Item añadido");
  }

  function openEditItem(item: LineItem) {
    setEditingItemId(item.id);
    setEditingItemDescription(item.description);
    setEditingItemQuantity(item.quantity);
    setEditingItemTotalPrice((item.totalPriceCents / 100).toFixed(2).replace(".", ","));
    setEditingItemShared(item.isShared);
  }

  async function saveItemEdition(item: LineItem) {
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
    const totalPriceCents = parseCurrencyInput(editingItemTotalPrice);
    if (totalPriceCents === null) {
      setFormError("El precio total del item no es válido");
      return;
    }

    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editingItemDescription,
        quantity: editingItemQuantity,
        totalPriceCents,
        isShared: editingItemShared
      })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setFormError(data?.message ?? "No se pudo editar el item");
      return;
    }

    setEditingItemId(null);
    await refresh();
    setFeedback("Item actualizado");
  }

  async function changeClaim(lineItemId: string, participantId: string, nextQuantity: number, isShared: boolean) {
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
    setFormError(null);
    if (!isShared) {
      const item = bill.lineItems.find((entry) => entry.id === lineItemId);
      if (!item) {
        return;
      }

      const claimedByOthers = bill.claims
        .filter((claim) => claim.lineItemId === lineItemId && claim.participantId !== participantId)
        .reduce((acc, claim) => acc + claim.quantity, 0);
      const maxForParticipant = Math.max(0, item.quantity - claimedByOthers);
      const boundedQuantity = Math.max(0, Math.min(nextQuantity, maxForParticipant));

      if (boundedQuantity !== nextQuantity) {
        setFormError("No puedes asignar más unidades de las que tiene el item");
      }

      if (boundedQuantity <= 0) {
        await fetch(`/api/items/${lineItemId}/claims/${participantId}`, { method: "DELETE" });
        await refresh();
        setFeedback("Asignación actualizada");
        return;
      }

      await fetch(`/api/items/${lineItemId}/claims/${participantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: boundedQuantity, isShared: false })
      });

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

  function updateClaimDraft(lineItemId: string, participantId: string, value: string) {
    setClaimDrafts((prev) => ({ ...prev, [`${lineItemId}_${participantId}`]: value }));
  }

  async function commitClaimDraft(item: LineItem, participantId: string) {
    const key = `${item.id}_${participantId}`;
    const raw = claimDrafts[key];
    if (raw === undefined) {
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setFormError("La cantidad debe ser 0 o mayor");
      return;
    }

    await changeClaim(item.id, participantId, parsed, false);
    setClaimDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function toggleShared(item: LineItem, value: boolean) {
    if (bill.isClosed) {
      setFormError("Este ticket está cerrado. Reábrelo para editarlo.");
      return;
    }
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

  async function toggleClosed(nextClosed: boolean) {
    const res = await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: nextClosed })
    });
    if (!res.ok) {
      setFormError("No se pudo actualizar el estado del ticket");
      return;
    }
    await refresh();
    setFeedback(nextClosed ? "Ticket cerrado" : "Ticket reabierto");
  }

  return (
    <section className="ticket-workspace">
      <div className="ticket-main page-stack">
        <div className="card card-hero">
          <div className="inline-row" style={{ marginBottom: "0.9rem" }}>
            <span className="badge">1. Configura</span>
            <span className="badge">2. Reparte</span>
            <span className="badge">3. Revisa</span>
            {bill.isClosed ? <span className="badge">Cerrado</span> : null}
          </div>
          {bill.isClosed ? (
            <div className="section-empty">
              <strong>Este ticket está cerrado.</strong>
              <p className="subtle">Puedes reabrirlo si necesitas hacer cambios.</p>
              <div>
                <button className="btn" type="button" onClick={() => void toggleClosed(false)}>Reabrir ticket</button>
              </div>
            </div>
          ) : null}
          {feedback ? <p className="subtle" style={{ color: "var(--accent-strong)" }}>{feedback}</p> : null}
          {formError ? <p className="error-text">{formError}</p> : null}
        </div>

        <div className="card">
          <button className="ticket-section-toggle" type="button" onClick={() => toggleSection("basics")}>
            <span>Paso 1 · Nombre del ticket</span>
            <span>{openSections.basics ? "Ocultar" : "Abrir"}</span>
          </button>
          {openSections.basics ? (
            <div className="ticket-section-body">
              <label className="field-stack">
                <span>Nombre del ticket</span>
                <input className="input" defaultValue={bill.name} onBlur={(e) => void setBillNameOnBlur(e.target.value)} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="card">
          <button className="ticket-section-toggle" type="button" onClick={() => toggleSection("participants")}>
            <span>Paso 2 · Amigos y pagador</span>
            <span>{openSections.participants ? "Ocultar" : "Abrir"}</span>
          </button>
          {openSections.participants ? (
            <div className="ticket-section-body">
              <div className="payer-callout">
                <p className="eyebrow">Paso obligatorio</p>
                <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>¿Quién pagó el ticket completo?</h3>
                <p className="subtle">Marca primero a la persona que adelantó la cuenta para calcular bien la liquidación.</p>
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
                          <span
                            className="name-pill"
                            style={{ backgroundColor: friend.color, color: getReadableTextColor(friend.color) }}
                          >
                            {friend.name}
                          </span>
                        </div>
                        <span className="subtle" style={{ textAlign: "left" }}>
                          {alreadyAdded
                            ? "Ya está en este ticket"
                            : friend.usageCount > 0
                              ? `Usado ${friend.usageCount} ve${friend.usageCount === 1 ? "z" : "ces"}`
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
                  <button
                    className="color-random-btn"
                    style={{ color: participantColor }}
                    type="button"
                    onClick={() => setParticipantColor((prev) => pickRandomFriendColor(prev))}
                    aria-label="Cambiar color del participante"
                  />
                  <ColorChip color={participantColor} label={participantName.trim() || "Vista previa"} />
                </div>
                <button className="btn" type="submit">Agregar participante</button>
              </form>

              <div className="action-bar">
                <select className="input" value={selectedGangId} onChange={(e) => setSelectedGangId(e.target.value)}>
                  <option value="">Selecciona una pandilla</option>
                  {gangs.map((gang) => (
                    <option key={gang.id} value={gang.id}>{gang.name}</option>
                  ))}
                </select>
                <button className="btn" type="button" onClick={() => void addGangParticipants()}>
                  Añadir pandilla
                </button>
              </div>

              <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.8rem" }}>
                {bill.participants.map((participant) => (
                  <div key={participant.id} className="participant-row">
                    <input
                      type="radio"
                      name="payer"
                      checked={bill.payerParticipantId === participant.id}
                      onChange={() => void setPayer(participant.id)}
                    />
                    <span className="name-pill" style={{ backgroundColor: participant.color, color: getReadableTextColor(participant.color) }}>
                      {participant.name}
                    </span>
                    {participant.friendId ? <span className="badge">Amigo guardado</span> : null}
                    {!participant.friendId ? (
                      <button className="btn" type="button" onClick={() => void saveParticipantAsFriend(participant)}>
                        Guardar amigo
                      </button>
                    ) : null}
                    {bill.payerParticipantId === participant.id ? <span className="badge">Pagador inicial</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <button className="ticket-section-toggle" type="button" onClick={() => toggleSection("items")}>
            <span>Paso 3 · Ítems y reparto</span>
            <span>{openSections.items ? "Ocultar" : "Abrir"}</span>
          </button>
          {openSections.items ? (
            <div className="ticket-section-body">
              <p className="subtle">Introduce el precio total que te da la cuenta para cada ítem, no el unitario.</p>
              <form className="grid-auto" onSubmit={addItem}>
                <input className="input" placeholder="Descripción" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} required />
                <input className="input" type="number" min={1} value={itemQuantity} onChange={(e) => setItemQuantity(Number(e.target.value))} required />
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="Precio total (ej: 13,00)"
                  value={itemTotalPrice}
                  onChange={(e) => setItemTotalPrice(e.target.value)}
                  required
                />
                <label className="inline-row">
                  <input type="checkbox" checked={itemShared} onChange={(e) => setItemShared(e.target.checked)} />
                  Compartido
                </label>
                <button className="btn" type="submit">Agregar item</button>
              </form>

              <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.8rem" }}>
                {bill.lineItems.length === 0 ? (
                  <div className="section-empty">
                    <strong>Todavía no hay items.</strong>
                    <p className="subtle">Añade consumos con cantidad y precio total.</p>
                  </div>
                ) : null}
                {bill.lineItems.map((item) => (
                  <article key={item.id} className="panel-row">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
                      <strong>{item.description}</strong>
                      <div className="inline-row">
                        <span>{formatCurrency(item.totalPriceCents)}</span>
                        <button className="btn" type="button" onClick={() => openEditItem(item)} aria-label="Editar item">
                          ...
                        </button>
                      </div>
                    </div>

                    {editingItemId === item.id ? (
                      <div className="panel-row" style={{ background: "rgba(15, 118, 110, 0.07)" }}>
                        <div className="grid-auto">
                          <input className="input" value={editingItemDescription} onChange={(e) => setEditingItemDescription(e.target.value)} />
                          <input className="input" type="number" min={1} value={editingItemQuantity} onChange={(e) => setEditingItemQuantity(Number(e.target.value))} />
                          <input className="input" value={editingItemTotalPrice} onChange={(e) => setEditingItemTotalPrice(e.target.value)} />
                          <label className="inline-row">
                            <input type="checkbox" checked={editingItemShared} onChange={(e) => setEditingItemShared(e.target.checked)} />
                            Compartido
                          </label>
                        </div>
                        <div className="action-bar">
                          <button className="btn btn-primary" type="button" onClick={() => void saveItemEdition(item)}>Guardar cambios</button>
                          <button className="btn" type="button" onClick={() => setEditingItemId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : null}

                    <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" }}>
                      <input type="checkbox" checked={item.isShared} onChange={(e) => void toggleShared(item, e.target.checked)} />
                      Item compartido
                    </label>

                    <p className="subtle">{itemStateById.get(item.id)?.coverageLabel}</p>

                    <div className="grid-auto" style={{ marginTop: "0.6rem" }}>
                      {bill.participants.map((participant) => {
                        const key = `${item.id}_${participant.id}`;
                        const claim = claimsByKey.get(key);

                        if (item.isShared) {
                          return (
                            <label key={key} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                              <input
                                type="checkbox"
                                checked={Boolean(claim?.isShared)}
                                onChange={(e) => void changeClaim(item.id, participant.id, e.target.checked ? 1 : 0, e.target.checked)}
                              />
                              <span className="name-pill" style={{ backgroundColor: participant.color, color: getReadableTextColor(participant.color) }}>
                                {participant.name}
                              </span>
                            </label>
                          );
                        }

                        return (
                          <div key={key} className="claim-stepper">
                            <span className="name-pill" style={{ backgroundColor: participant.color, color: getReadableTextColor(participant.color) }}>
                              {participant.name}
                            </span>
                            <input
                              className="input claim-qty-input"
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={claimDrafts[key] ?? String(claim?.quantity ?? 0)}
                              onChange={(e) => updateClaimDraft(item.id, participant.id, e.target.value)}
                              onBlur={() => void commitClaimDraft(item, participant.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void commitClaimDraft(item, participant.id);
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" type="button" onClick={goToSettlement}>
            Ver liquidación
          </button>
        </div>
      </div>

      <aside className="ticket-sidebar">
        <div className="card ticket-summary-card">
          <div className="action-bar">
            <p className="eyebrow" style={{ margin: 0 }}>Resumen</p>
            <button className="btn" type="button" onClick={() => setIsSummaryVisible((prev) => !prev)}>
              {isSummaryVisible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {isSummaryVisible ? (
            <div style={{ display: "grid", gap: "0.8rem" }}>
              <div className="money-panel">
                <span className="subtle">Total actual</span>
                <p style={{ marginTop: "0.35rem", marginBottom: 0, fontWeight: 800, fontSize: "1.45rem" }}>{formatCurrency(bill.totalCents)}</p>
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
          ) : null}
        </div>
      </aside>
    </section>
  );
}
