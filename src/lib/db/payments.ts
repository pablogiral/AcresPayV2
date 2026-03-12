import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, payments } from "@/lib/db/schema";

export async function resetBillPayments(billId: string) {
  await db.delete(payments).where(eq(payments.billId, billId));
  await db
    .update(bills)
    .set({ updatedAt: new Date() })
    .where(eq(bills.id, billId));
}
