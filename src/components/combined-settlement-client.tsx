"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/money";

type TotalRow = {
  key: string;
  label: string;
  balanceCents: number;
};

type Transfer = {
  fromKey: string;
  toKey: string;
  fromLabel: string;
  toLabel: string;
  amountCents: number;
};

export function CombinedSettlementClient({
  totals,
  transfers,
  beforeTransfersCount,
  selectedBillsCount
}: {
  totals: TotalRow[];
  transfers: Transfer[];
  beforeTransfersCount: number;
  selectedBillsCount: number;
}) {
  const grandTotal = useMemo(
    () => totals.reduce((acc, row) => acc + Math.max(0, row.balanceCents), 0),
    [totals]
  );
  const reduction = Math.max(0, beforeTransfersCount - transfers.length);

  return (
    <section className="card card-hero" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <p className="eyebrow">Optimización real</p>
        <h1 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Liquidación combinada</h1>
        <p className="subtle">Has unido {selectedBillsCount} tickets para reducir pagos cruzados y dejar un único cierre más limpio.</p>
      </div>

      <div className="grid-auto">
        <div className="panel-row">
          <strong>{beforeTransfersCount}</strong>
          <span className="subtle">Pagos separados antes</span>
        </div>
        <div className="panel-row">
          <strong>{transfers.length}</strong>
          <span className="subtle">Pagos tras optimizar</span>
        </div>
        <div className="panel-row">
          <strong>{reduction}</strong>
          <span className="subtle">Pagos evitados</span>
        </div>
        <div className="panel-row">
          <strong>{formatCurrency(grandTotal)}</strong>
          <span className="subtle">Total distribuido</span>
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Balances</h2>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {totals.map((row) => (
            <div key={row.key} className="panel-row" style={{ gridTemplateColumns: "1fr auto", padding: "0.8rem 1rem" }}>
              <span>{row.label}</span>
              <strong>{formatCurrency(row.balanceCents)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Transferencias optimizadas</h2>
        {transfers.length === 0 ? (
          <div className="section-empty">
            <strong>No hace falta ningún pago adicional.</strong>
            <p className="subtle">Los balances se compensan entre sí al combinar estos tickets.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {transfers.map((t, idx) => (
              <div key={idx} className="panel-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <span>{t.fromLabel} {"->"} {t.toLabel}</span>
                <strong>{formatCurrency(t.amountCents)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
