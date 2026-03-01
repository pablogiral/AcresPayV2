"use client";

import { useEffect, useMemo, useState } from "react";
import { FRIEND_COLORS } from "@/lib/constants";

type Friend = {
  id: string;
  name: string;
  color: string;
};

export function FriendsPageClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FRIEND_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taken = useMemo(() => new Set(friends.map((f) => f.color)), [friends]);

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
    <section style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Amigos</h1>
        <p style={{ color: "#64748b" }}>Guarda participantes frecuentes con color único.</p>

        <form onSubmit={createFriend} className="grid-auto" style={{ alignItems: "end" }}>
          <label>
            <span>Nombre</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            <span>Color</span>
            <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
              {FRIEND_COLORS.map((c) => (
                <option key={c} value={c} disabled={taken.has(c)}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Agregar"}
          </button>
        </form>

        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lista</h2>
        {friends.length === 0 ? <p style={{ color: "#64748b" }}>Aún no tienes amigos guardados.</p> : null}

        <div style={{ display: "grid", gap: "0.65rem" }}>
          {friends.map((friend) => (
            <div key={friend.id} style={{ display: "grid", gap: "0.45rem", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
                <strong>{friend.name}</strong>
                <span className="badge">{friend.color}</span>
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
                <select className="input" value={friend.color} onChange={(e) => void recolorFriend(friend.id, e.target.value)}>
                  {FRIEND_COLORS.map((c) => (
                    <option key={`${friend.id}-${c}`} value={c} disabled={c !== friend.color && taken.has(c)}>
                      {c}
                    </option>
                  ))}
                </select>
                <button className="btn" type="button" onClick={() => void removeFriend(friend.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
