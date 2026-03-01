"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/money";

type TotalRow = {
  key: string;
  balanceCents: number;
};

type Transfer = {
  fromKey: string;
  toKey: string;
  amountCents: number;
};

export function CombinedSettlementClient({ totals, transfers }: { totals: TotalRow[]; transfers: Transfer[] }) {
  const grandTotal = useMemo(
    () => totals.reduce((acc, row) => acc + Math.max(0, row.balanceCents), 0),
    [totals]
  );

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ marginTop: 0 }}>Liquidación combinada</h1>
        <p style={{ margin: 0, color: "#64748b" }}>Total distribuido: {formatCurrency(grandTotal)}</p>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Balances</h2>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {totals.map((row) => (
            <div key={row.key} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{row.key}</span>
              <strong>{formatCurrency(row.balanceCents)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Transferencias optimizadas</h2>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {transfers.map((t, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t.fromKey} {"->"} {t.toKey}</span>
              <strong>{formatCurrency(t.amountCents)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
