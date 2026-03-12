import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { SettlementClient } from "@/components/settlement-client";

export default async function SettlementPage({ params }: { params: Promise<{ billId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { billId } = await params;
  const bill = await db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, session.user.id)),
    with: {
      participants: true,
      lineItems: true,
      payments: true
    }
  });

  if (!bill) {
    return notFound();
  }

  const lineItemIds = bill.lineItems.map((item) => item.id);
  const allClaims = lineItemIds.length
    ? await db.query.claims.findMany({ where: (table, { inArray }) => inArray(table.lineItemId, lineItemIds) })
    : [];

  return (
    <SettlementClient
      bill={{
        id: bill.id,
        isClosed: bill.isClosed,
        payerParticipantId: bill.payerParticipantId,
        participants: bill.participants.map((x) => ({ id: x.id, name: x.name })),
        lineItems: bill.lineItems.map((x) => ({
          id: x.id,
          totalPriceCents: x.totalPriceCents,
          isShared: x.isShared
        })),
        claims: allClaims.map((x) => ({
          lineItemId: x.lineItemId,
          participantId: x.participantId,
          quantity: x.quantity,
          isShared: x.isShared
        })),
        payments: bill.payments.map((x) => ({
          id: x.id,
          fromParticipantId: x.fromParticipantId,
          toParticipantId: x.toParticipantId,
          amountCents: x.amountCents,
          isPaid: x.isPaid
        }))
      }}
    />
  );
}
