import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills } from "@/lib/db/schema";

export async function findOwnedBillOrNull(billId: string, userId: string) {
  return db.query.bills.findFirst({
    where: and(eq(bills.id, billId), eq(bills.userId, userId))
  });
}

export async function assertOwnedBill(billId: string, userId: string) {
  const bill = await findOwnedBillOrNull(billId, userId);
  if (!bill) {
    throw new Error("BILL_NOT_FOUND");
  }
  return bill;
}
