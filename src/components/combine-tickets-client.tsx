"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/money";

type Bill = {
  id: string;
  name: string;
  totalCents: number;
  date: string;
  hasPaidPayments: boolean;
};

export function CombineTicketsClient({ bills }: { bills: Bill[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  const total = useMemo(() => bills.filter((b) => selected.includes(b.id)).reduce((acc, b) => acc + b.totalCents, 0), [bills, selected]);
  const blockedSelectedCount = selected.filter((id) => bills.find((bill) => bill.id === id)?.hasPaidPayments).length;
  const estimatedReview = selected.length >= 2
    ? `Vas a comparar ${selected.length} tickets y ver cuántos pagos puedes ahorrarte antes de cerrar.`
    : "Selecciona al menos dos tickets para calcular el ahorro real de pagos.";

  return (
    <section className="card card-hero">
      <p className="eyebrow">Optimización</p>
      <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Combinar Tickets</h1>
      <p className="subtle">Selecciona dos o más tickets para simplificar pagos cruzados y ver el ahorro antes de cerrar.</p>

      {bills.length === 0 ? (
        <div className="section-empty">
          <strong>Todavía no tienes tickets para combinar.</strong>
          <p className="subtle">Crea al menos dos tickets y aquí podrás reducir pagos repetidos entre las mismas personas.</p>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "0.7rem" }}>
        {bills.map((bill) => (
          <label key={bill.id} className="panel-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <div>
              <strong>{bill.name}</strong>
              <p className="subtle" style={{ marginTop: "0.25rem" }}>{new Date(bill.date).toLocaleDateString("es-ES")}</p>
              {bill.hasPaidPayments ? (
                <p className="subtle" style={{ marginTop: "0.25rem", color: "#9a3412" }}>
                  Este ticket ya tiene pagos iniciados y no se puede combinar.
                </p>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>{formatCurrency(bill.totalCents)}</span>
              <input
                type="checkbox"
                checked={selected.includes(bill.id)}
                disabled={bill.hasPaidPayments}
                onChange={(e) => {
                  setSelected((prev) =>
                    e.target.checked ? [...prev, bill.id] : prev.filter((id) => id !== bill.id)
                  );
                }}
              />
            </div>
          </label>
        ))}
      </div>

      <div className="action-bar" style={{ marginTop: "1rem" }}>
        <div>
          <strong>Total seleccionado: {formatCurrency(total)}</strong>
          <p className="subtle" style={{ marginTop: "0.35rem" }}>{estimatedReview}</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={selected.length < 2 || blockedSelectedCount > 0}
          onClick={() => router.push(`/combined-settlement?bills=${selected.join(",")}`)}
        >
          Ver liquidación combinada
        </button>
      </div>
    </section>
  );
}
