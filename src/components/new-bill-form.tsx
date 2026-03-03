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
    <section className="card card-hero" style={{ maxWidth: 720 }}>
      <p className="eyebrow">Nuevo ticket</p>
      <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Empieza un gasto nuevo</h1>
      <p className="subtle">Crea el ticket y después añade participantes, items y reparto.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.8rem" }}>
        <input
          className="input"
          placeholder="Ej: Cena viernes"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creando..." : "Crear ticket"}
        </button>
      </form>
    </section>
  );
}
