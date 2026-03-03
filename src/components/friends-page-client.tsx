"use client";

import { useEffect, useState } from "react";
import { ColorChip } from "@/components/color-chip";
import { pickRandomFriendColor } from "@/lib/constants";

type Friend = {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  lastUsedAt: string | null;
};

export function FriendsPageClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(() => pickRandomFriendColor());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const data = (await res.json()) as { friends: Friend[] };
    setFriends(data.friends);
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

  async function recolorFriend(id: string, nextColor: string) {
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

  return (
    <section className="page-stack">
      <div className="card card-hero">
        <h1 style={{ marginTop: 0 }}>Amigos</h1>
        <p className="subtle">Guarda participantes frecuentes, reutilízalos más rápido y reconoce a cada uno de un vistazo.</p>

        <form onSubmit={createFriend} className="grid-auto" style={{ alignItems: "end" }}>
          <label className="field-stack">
            <span>Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <div className="field-stack">
            <span>Etiqueta</span>
            <div className="inline-row">
              <ColorChip color={color} label="Nuevo" />
              <button className="btn" type="button" onClick={() => setColor(pickRandomFriendColor(color))}>
                Otro tono
              </button>
            </div>
          </div>

          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Agregar amigo"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lista</h2>
        {friends.length === 0 ? (
          <div className="section-empty" style={{ marginBottom: "0.9rem" }}>
            <strong>Aún no tienes amigos guardados.</strong>
            <p className="subtle">Guárdalos aquí y luego podrás añadirlos a un ticket con un solo toque, sin dejar de poder escribir nombres nuevos al vuelo.</p>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: "0.9rem" }}>
          {friends.map((friend) => (
            <div key={friend.id} className="panel-row">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <strong>{friend.name}</strong>
                  <p className="subtle" style={{ margin: "0.25rem 0 0" }}>
                    {friend.usageCount > 0
                      ? `Usado en ${friend.usageCount} ticket${friend.usageCount === 1 ? "" : "s"}${friend.lastUsedAt ? ` · Último uso ${new Date(friend.lastUsedAt).toLocaleDateString("es-ES")}` : ""}`
                      : "Aún no se ha usado en ningún ticket."}
                  </p>
                </div>
                <ColorChip color={friend.color} />
              </div>

              <div className="grid-auto" style={{ alignItems: "center" }}>
                <input
                  className="input"
                  defaultValue={friend.name}
                  onBlur={(e) => {
                    if (e.target.value !== friend.name) {
                      void renameFriend(friend.id, e.target.value);
                    }
                  }}
                />
                <button className="btn" type="button" onClick={() => void recolorFriend(friend.id, pickRandomFriendColor(friend.color))}>
                  Nuevo color
                </button>
                <button className="btn btn-danger" type="button" onClick={() => void removeFriend(friend.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
