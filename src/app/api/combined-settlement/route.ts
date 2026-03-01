import { and, asc, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, claims, lineItems, participants } from "@/lib/db/schema";
import { jsonError, jsonOk, requireUserId } from "@/lib/api";
import { combinedSettlementSchema } from "@/lib/validators/bills";
import { calculateBillSettlement, calculateCombinedSettlement } from "@/lib/settlement";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function participantKey(row: { friendId: string | null; name: string; color: string }) {
  if (row.friendId) {
    return `friend:${row.friendId}`;
  }

  return `name:${normalizeName(row.name)}|color:${row.color}`;
}

export async function POST(req: NextRequest) {
  const authCheck = await requireUserId();
  if ("error" in authCheck) {
    return authCheck.error;
  }

  const body = await req.json().catch(() => null);
  const parsed = combinedSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos inválidos", 400);
  }

  const ownedBills = await db.query.bills.findMany({
    where: and(eq(bills.userId, authCheck.userId), inArray(bills.id, parsed.data.billIds)),
    orderBy: [asc(bills.createdAt)]
  });

  if (ownedBills.length !== parsed.data.billIds.length) {
    return jsonError("Uno o más tickets no son accesibles", 403);
  }

  const rows: Array<{ key: string; balanceCents: number }> = [];

  for (const bill of ownedBills) {
    const billParticipants = await db.query.participants.findMany({
      where: eq(participants.billId, bill.id)
    });
    const billLineItems = await db.query.lineItems.findMany({
      where: eq(lineItems.billId, bill.id)
    });
    const lineItemIds = billLineItems.map((x) => x.id);
    const billClaims = lineItemIds.length
      ? await db.query.claims.findMany({ where: inArray(claims.lineItemId, lineItemIds) })
      : [];

    if (!bill.payerParticipantId) {
      continue;
    }

    const settlement = calculateBillSettlement({
      participants: billParticipants,
      lineItems: billLineItems,
      claims: billClaims,
      payerParticipantId: bill.payerParticipantId
    });

    for (const balance of settlement.balances) {
      const participant = billParticipants.find((x) => x.id === balance.participantId);
      if (!participant) {
        continue;
      }

      rows.push({
        key: participantKey(participant),
        balanceCents: balance.amountCents
      });
    }
  }

  const totalsMap = new Map<string, number>();
  for (const row of rows) {
    totalsMap.set(row.key, (totalsMap.get(row.key) ?? 0) + row.balanceCents);
  }

  const totals = [...totalsMap.entries()].map(([key, balanceCents]) => ({ key, balanceCents }));
  const combined = calculateCombinedSettlement(totals);

  return jsonOk({
    totals,
    transfers: combined.transfers
  });
}
