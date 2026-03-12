import { CombinedSettlementClient } from "@/components/combined-settlement-client";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bills, claims, lineItems, participants } from "@/lib/db/schema";
import { calculateBillSettlement, calculateCombinedSettlement } from "@/lib/settlement";

type Props = {
  searchParams: Promise<{ bills?: string }>;
};

export default async function CombinedSettlementPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const params = await searchParams;
  const billIds = params.bills?.split(",").filter(Boolean) ?? [];

  if (billIds.length < 2) {
    return <section className="card"><p>Debes seleccionar al menos dos tickets.</p></section>;
  }

  const ownedBills = await db.query.bills.findMany({
    where: and(eq(bills.userId, session.user.id), inArray(bills.id, billIds)),
    with: {
      payments: true
    }
  });

  if (ownedBills.length !== billIds.length) {
    return <section className="card"><p>No tienes acceso a todos los tickets seleccionados.</p></section>;
  }

  if (ownedBills.some((bill) => bill.payments.some((payment) => payment.isPaid))) {
    return <section className="card"><p>No puedes combinar tickets que ya tengan pagos iniciados.</p></section>;
  }

  const aggregated = new Map<string, number>();
  const labels = new Map<string, string>();
  let beforeTransfersCount = 0;

  for (const bill of ownedBills) {
    if (!bill.payerParticipantId) {
      continue;
    }

    const billParticipants = await db.query.participants.findMany({
      where: eq(participants.billId, bill.id)
    });
    const billItems = await db.query.lineItems.findMany({
      where: eq(lineItems.billId, bill.id)
    });
    const itemIds = billItems.map((item) => item.id);
    const billClaims = itemIds.length
      ? await db.query.claims.findMany({ where: inArray(claims.lineItemId, itemIds) })
      : [];

    const result = calculateBillSettlement({
      participants: billParticipants,
      lineItems: billItems,
      claims: billClaims,
      payerParticipantId: bill.payerParticipantId
    });
    beforeTransfersCount += result.transfers.length;

    for (const balance of result.balances) {
      const participant = billParticipants.find((x) => x.id === balance.participantId);
      if (!participant) continue;

      const key = participant.friendId
        ? `friend:${participant.friendId}`
        : `name:${participant.name.trim().toLowerCase()}|color:${participant.color}`;
      if (!labels.has(key)) {
        labels.set(key, participant.name);
      }
      aggregated.set(key, (aggregated.get(key) ?? 0) + balance.amountCents);
    }
  }

  const totals = [...aggregated.entries()].map(([key, balanceCents]) => ({
    key,
    label: labels.get(key) ?? key,
    balanceCents
  }));
  const combined = calculateCombinedSettlement(totals);

  return (
    <CombinedSettlementClient
      totals={totals}
      transfers={combined.transfers.map((transfer) => ({
        ...transfer,
        fromLabel: labels.get(transfer.fromKey) ?? transfer.fromKey,
        toLabel: labels.get(transfer.toKey) ?? transfer.toKey
      }))}
      beforeTransfersCount={beforeTransfersCount}
      selectedBillsCount={ownedBills.length}
    />
  );
}
