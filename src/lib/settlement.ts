export type Transfer = {
  fromParticipantId: string;
  toParticipantId: string;
  amountCents: number;
};

export type BalanceRow = {
  participantId: string;
  amountCents: number;
};

type SettlementInput = {
  participants: Array<{ id: string }>;
  lineItems: Array<{ id: string; totalPriceCents: number; isShared: boolean }>;
  claims: Array<{ lineItemId: string; participantId: string; quantity: number; isShared: boolean }>;
  payerParticipantId: string;
};

export function calculateBillSettlement(input: SettlementInput): {
  balances: BalanceRow[];
  transfers: Transfer[];
} {
  const balancesMap = new Map<string, number>();

  for (const participant of input.participants) {
    balancesMap.set(participant.id, 0);
  }

  const claimsByLineItem = groupBy(input.claims, (claim) => claim.lineItemId);

  for (const item of input.lineItems) {
    const itemClaims = claimsByLineItem.get(item.id) ?? [];
    if (!itemClaims.length) {
      continue;
    }

    if (item.isShared) {
      const sharedParticipants = itemClaims.filter((claim) => claim.isShared);
      if (!sharedParticipants.length) {
        continue;
      }

      const perPerson = Math.floor(item.totalPriceCents / sharedParticipants.length);
      let remainder = item.totalPriceCents - perPerson * sharedParticipants.length;

      for (const claim of sharedParticipants) {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) {
          remainder -= 1;
        }
        balancesMap.set(claim.participantId, (balancesMap.get(claim.participantId) ?? 0) + perPerson + extra);
      }
    } else {
      const totalClaimed = itemClaims.reduce((acc, claim) => acc + claim.quantity, 0);
      if (totalClaimed <= 0) {
        continue;
      }

      for (const claim of itemClaims) {
        const weight = claim.quantity / totalClaimed;
        const share = Math.round(item.totalPriceCents * weight);
        balancesMap.set(claim.participantId, (balancesMap.get(claim.participantId) ?? 0) + share);
      }
    }
  }

  const billTotal = input.lineItems.reduce((acc, item) => acc + item.totalPriceCents, 0);
  balancesMap.set(input.payerParticipantId, (balancesMap.get(input.payerParticipantId) ?? 0) - billTotal);

  const balances = [...balancesMap.entries()].map(([participantId, amountCents]) => ({
    participantId,
    amountCents
  }));

  return {
    balances,
    transfers: minimizeTransfers(balances)
  };
}

export function calculateCombinedSettlement(
  rows: Array<{
    key: string;
    balanceCents: number;
  }>
): { transfers: Array<{ fromKey: string; toKey: string; amountCents: number }> } {
  const transfers = minimizeTransfers(
    rows.map((row) => ({ participantId: row.key, amountCents: row.balanceCents }))
  ).map((transfer) => ({
    fromKey: transfer.fromParticipantId,
    toKey: transfer.toParticipantId,
    amountCents: transfer.amountCents
  }));

  return { transfers };
}

function minimizeTransfers(balances: BalanceRow[]): Transfer[] {
  const debtors = balances
    .filter((row) => row.amountCents > 0)
    .map((row) => ({ participantId: row.participantId, amountCents: row.amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const creditors = balances
    .filter((row) => row.amountCents < 0)
    .map((row) => ({ participantId: row.participantId, amountCents: Math.abs(row.amountCents) }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: Transfer[] = [];
  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(debtor.amountCents, creditor.amountCents);
    if (amount > 0) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        amountCents: amount
      });
    }

    debtor.amountCents -= amount;
    creditor.amountCents -= amount;

    if (debtor.amountCents === 0) {
      debtorIdx += 1;
    }

    if (creditor.amountCents === 0) {
      creditorIdx += 1;
    }
  }

  return transfers;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}
