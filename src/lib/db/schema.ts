import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  index,
  primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId)
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").notNull().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull()
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull()
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

export const friends = pgTable(
  "friends",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [index("friends_user_idx").on(table.userId)]
);

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    date: timestamp("date", { mode: "date" }).defaultNow().notNull(),
    payerParticipantId: text("payer_participant_id"),
    totalCents: integer("total_cents").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [index("bills_user_idx").on(table.userId)]
);

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    friendId: text("friend_id").references(() => friends.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [index("participants_bill_idx").on(table.billId)]
);

export const lineItems = pgTable(
  "line_items",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalPriceCents: integer("total_price_cents").notNull(),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [index("line_items_bill_idx").on(table.billId)]
);

export const claims = pgTable(
  "claims",
  {
    id: text("id").primaryKey(),
    lineItemId: text("line_item_id").notNull().references(() => lineItems.id, { onDelete: "cascade" }),
    participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [
    unique("claims_item_participant_unique").on(table.lineItemId, table.participantId),
    index("claims_item_idx").on(table.lineItemId),
    index("claims_participant_idx").on(table.participantId)
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
    fromParticipantId: text("from_participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    toParticipantId: text("to_participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    isPaid: boolean("is_paid").notNull().default(false),
    paidAt: timestamp("paid_at", { mode: "date" }),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull()
  },
  (table) => [
    unique("payments_bill_pair_unique").on(table.billId, table.fromParticipantId, table.toParticipantId),
    index("payments_bill_idx").on(table.billId)
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  friends: many(friends),
  bills: many(bills),
  sessions: many(sessions),
  accounts: many(accounts)
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  owner: one(users, {
    fields: [bills.userId],
    references: [users.id]
  }),
  participants: many(participants),
  lineItems: many(lineItems),
  payments: many(payments)
}));

export const friendsRelations = relations(friends, ({ one, many }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id]
  }),
  participants: many(participants)
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  bill: one(bills, {
    fields: [participants.billId],
    references: [bills.id]
  }),
  friend: one(friends, {
    fields: [participants.friendId],
    references: [friends.id]
  }),
  claims: many(claims)
}));

export const lineItemsRelations = relations(lineItems, ({ one, many }) => ({
  bill: one(bills, {
    fields: [lineItems.billId],
    references: [bills.id]
  }),
  claims: many(claims)
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  lineItem: one(lineItems, {
    fields: [claims.lineItemId],
    references: [lineItems.id]
  }),
  participant: one(participants, {
    fields: [claims.participantId],
    references: [participants.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id]
  }),
  fromParticipant: one(participants, {
    fields: [payments.fromParticipantId],
    references: [participants.id]
  }),
  toParticipant: one(participants, {
    fields: [payments.toParticipantId],
    references: [participants.id]
  }),
  updatedByUser: one(users, {
    fields: [payments.updatedByUserId],
    references: [users.id]
  })
}));

export type User = typeof users.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Friend = typeof friends.$inferSelect;
