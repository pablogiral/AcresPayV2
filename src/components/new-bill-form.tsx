"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewBillForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "No se pudo crear ticket");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { bill: { id: string } };
    router.push(`/bill/${data.bill.id}`);
  }

  return (
    <section className="card" style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0 }}>Nuevo Ticket</h1>
      <p style={{ color: "#64748b" }}>Crea el ticket y después añade participantes e items.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.8rem" }}>
        <input
          className="input"
          placeholder="Ej: Cena viernes"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creando..." : "Crear ticket"}
        </button>
      </form>
    </section>
  );
}
