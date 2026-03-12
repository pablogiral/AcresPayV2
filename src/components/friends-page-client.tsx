"use client";

import { useEffect, useState } from "react";
import { ColorChip, getReadableTextColor } from "@/components/color-chip";
import { pickRandomFriendColor } from "@/lib/constants";
import { formatCurrency } from "@/lib/money";

type Friend = {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  lastUsedAt: string | null;
  pendingCount: number;
  pendingAmountCents: number;
};

type Gang = {
  id: string;
  name: string;
  friendIds: string[];
};

export function FriendsPageClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [gangName, setGangName] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(() => pickRandomFriendColor());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [friendsRes, gangsRes] = await Promise.all([fetch("/api/friends"), fetch("/api/gangs")]);
    if (friendsRes.ok) {
      const data = (await friendsRes.json()) as { friends: Friend[] };
      setFriends(data.friends);
    }
    if (gangsRes.ok) {
      const data = (await gangsRes.json()) as { gangs: Gang[] };
      setGangs(data.gangs);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createFriend(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "Error al crear amigo");
      setSaving(false);
      return;
    }

    setName("");
    setColor(pickRandomFriendColor(color));
    await load();
    setSaving(false);
  }

  async function removeFriend(id: string) {
    const confirmed = window.confirm("¿Eliminar amigo?");
    if (!confirmed) return;
    const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      window.alert(data?.message ?? "No se pudo eliminar");
      return;
    }

    await load();
  }

  async function renameFriend(id: string, value: string) {
    if (!value.trim()) return;
    const res = await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value })
    });
    if (res.ok) {
      await load();
    }
  }

  async function recolorFriend(id: string, currentColor: string) {
    const nextColor = pickRandomFriendColor(currentColor);
    const res = await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: nextColor })
    });
    if (res.ok) {
      await load();
      return;
    }

    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    window.alert(data?.message ?? "No se pudo cambiar color");
  }

  async function createGang(e: React.FormEvent) {
    e.preventDefault();
    if (!gangName.trim()) {
      return;
    }

    const res = await fetch("/api/gangs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: gangName.trim() })
    });
    if (!res.ok) {
      return;
    }

    setGangName("");
    await load();
  }

  async function renameGang(id: string, value: string) {
    if (!value.trim()) return;
    await fetch(`/api/gangs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() })
    });
    await load();
  }

  async function deleteGang(id: string) {
    const confirmed = window.confirm("¿Eliminar pandilla?");
    if (!confirmed) return;
    await fetch(`/api/gangs/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleGangMember(gang: Gang, friendId: string) {
    const nextFriendIds = gang.friendIds.includes(friendId)
      ? gang.friendIds.filter((id) => id !== friendId)
      : [...gang.friendIds, friendId];

    await fetch(`/api/gangs/${gang.id}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendIds: nextFriendIds })
    });
    await load();
  }

  return (
    <section className="page-stack">
      <div className="card card-hero">
        <h1 style={{ marginTop: 0 }}>Amigos</h1>
        <p className="subtle">Guarda participantes frecuentes y reutilízalos en tus tickets.</p>

        <form onSubmit={createFriend} className="grid-auto" style={{ alignItems: "end" }}>
          <label className="field-stack">
            <span>Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div className="inline-row">
            <button
              className="color-random-btn"
              style={{ color }}
              type="button"
              onClick={() => setColor((prev) => pickRandomFriendColor(prev))}
              aria-label="Cambiar color"
            />
            <ColorChip color={color} label={name.trim() || "Nuevo"} />
          </div>

          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Agregar amigo"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
      </div>

      {friends.length === 0 ? (
        <div className="card section-empty">
          <strong>Aún no tienes amigos guardados.</strong>
          <p className="subtle">Cuando los crees aquí, podrás añadirlos al ticket con un solo toque.</p>
        </div>
      ) : null}

      <div className="friend-grid">
        {friends.map((friend) => (
          <article key={friend.id} className="card friend-card">
            <div className="action-bar">
              <span className="name-pill friend-name-pill" style={{ backgroundColor: friend.color, color: getReadableTextColor(friend.color) }}>{friend.name}</span>
            </div>

            <p className="subtle">
              {friend.usageCount > 0
                ? `Usado en ${friend.usageCount} ticket${friend.usageCount === 1 ? "" : "s"}`
                : "Aún no se ha usado en tickets"}
            </p>
            {friend.lastUsedAt ? (
              <p className="subtle">Último uso: {new Date(friend.lastUsedAt).toLocaleDateString("es-ES")}</p>
            ) : null}
            {friend.pendingCount > 0 ? (
              <p className="subtle" style={{ color: "#9a3412" }}>
                Pendientes: {friend.pendingCount} · {formatCurrency(friend.pendingAmountCents)}
              </p>
            ) : null}

            <input
              className="input"
              defaultValue={friend.name}
              onBlur={(e) => {
                if (e.target.value !== friend.name) {
                  void renameFriend(friend.id, e.target.value);
                }
              }}
            />

            <div className="action-bar">
              <button
                className="color-random-btn"
                style={{ color: friend.color }}
                type="button"
                onClick={() => void recolorFriend(friend.id, friend.color)}
                aria-label={`Cambiar color de ${friend.name}`}
              />
              <button className="btn btn-danger btn-sm" type="button" onClick={() => void removeFriend(friend.id)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Pandillas</h2>
        <p className="subtle">Crea grupos para añadir varios amigos a un ticket de golpe.</p>

        <form onSubmit={createGang} className="action-bar" style={{ marginTop: "0.75rem" }}>
          <input className="input" value={gangName} onChange={(e) => setGangName(e.target.value)} placeholder="Nombre de la pandilla" />
          <button className="btn btn-primary" type="submit">Crear pandilla</button>
        </form>

        <div style={{ display: "grid", gap: "0.8rem", marginTop: "0.9rem" }}>
          {gangs.length === 0 ? <p className="subtle">Aún no tienes pandillas.</p> : null}
          {gangs.map((gang) => (
            <article key={gang.id} className="panel-row">
              <div className="action-bar">
                <input
                  className="input"
                  defaultValue={gang.name}
                  onBlur={(e) => {
                    if (e.target.value !== gang.name) {
                      void renameGang(gang.id, e.target.value);
                    }
                  }}
                />
                <button className="btn btn-danger btn-sm" type="button" onClick={() => void deleteGang(gang.id)}>Eliminar</button>
              </div>
              <div className="saved-friends-grid">
                {friends.map((friend) => (
                  <label key={`${gang.id}_${friend.id}`} className="inline-row">
                    <input
                      type="checkbox"
                      checked={gang.friendIds.includes(friend.id)}
                      onChange={() => void toggleGangMember(gang, friend.id)}
                    />
                    <span className="name-pill" style={{ backgroundColor: friend.color, color: getReadableTextColor(friend.color) }}>
                      {friend.name}
                    </span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
