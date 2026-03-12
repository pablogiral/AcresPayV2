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
    <section className="form-shell">
      <div className="card card-hero">
        <div className="page-intro">
          <p className="eyebrow">Nuevo ticket</p>
          <h1 className="page-title">Abre una cuenta nueva en menos de un minuto.</h1>
          <p className="page-copy">Primero nombras el ticket. Después añades personas, consumos y reparto sin perder el hilo.</p>
        </div>
      </div>

      <div className="form-sheet">
        <div className="card">
          <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.95rem" }}>
            <label className="field-stack">
              <span>Nombre del ticket</span>
              <input
                className="input"
                placeholder="Cena del sábado, comida de oficina, vermut..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="action-bar">
              <button className="btn btn-primary" disabled={loading} type="submit">
                {loading ? "Creando..." : "Crear ticket"}
              </button>
            </div>
          </form>
        </div>

        <div className="feature-stack">
          <div className="card feature-note">
            <p className="eyebrow">Flujo</p>
            <strong>Nombre, participantes, items, liquidación.</strong>
            <p className="subtle">La app te guía por ese orden para que no te falte nada importante.</p>
          </div>
          <div className="card feature-note">
            <p className="eyebrow">Ventaja</p>
            <strong>Reparto claro incluso si la cuenta era caótica.</strong>
            <p className="subtle">Luego podrás guardar amigos, usar pandillas y cerrar el ticket cuando esté resuelto.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
