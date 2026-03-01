"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/money";

type Bill = {
  id: string;
  name: string;
  totalCents: number;
  date: string;
};

export function CombineTicketsClient({ bills }: { bills: Bill[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  const total = useMemo(() => bills.filter((b) => selected.includes(b.id)).reduce((acc, b) => acc + b.totalCents, 0), [bills, selected]);

  return (
    <section className="card">
      <h1 style={{ marginTop: 0 }}>Combinar Tickets</h1>
      <p style={{ color: "#64748b" }}>Selecciona dos o más tickets para optimizar transferencias.</p>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {bills.map((bill) => (
          <label key={bill.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.7rem" }}>
            <div>
              <strong>{bill.name}</strong>
              <p style={{ margin: 0, color: "#64748b" }}>{new Date(bill.date).toLocaleDateString("es-ES")}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>{formatCurrency(bill.totalCents)}</span>
              <input
                type="checkbox"
                checked={selected.includes(bill.id)}
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

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Total seleccionado: {formatCurrency(total)}</strong>
        <button
          className="btn btn-primary"
          disabled={selected.length < 2}
          onClick={() => router.push(`/combined-settlement?bills=${selected.join(",")}`)}
        >
          Ver liquidación combinada
        </button>
      </div>
    </section>
  );
}
