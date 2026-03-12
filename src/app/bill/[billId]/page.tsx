import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { BillEditor } from "@/components/bill-editor";

export default async function BillPage({ params }: { params: Promise<{ billId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { billId } = await params;
  const bill = await db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, session.user.id)),
    with: {
      participants: true,
      lineItems: true
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
    <BillEditor
      key={bill.id}
      initialBill={{
        id: bill.id,
        name: bill.name,
        isClosed: bill.isClosed,
        totalCents: bill.totalCents,
        payerParticipantId: bill.payerParticipantId,
        participants: bill.participants,
        lineItems: bill.lineItems,
        claims: allClaims
      }}
    />
  );
}
