import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  decimal, 
  timestamp, 
  boolean, 
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type AuthUser = typeof users.$inferSelect;

export const registerSchema = z.object({
  email: z.string().email("Email inválido").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
  name: z.string().trim().min(1, "Informe seu nome").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "Informe sua senha"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Accounts
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'bank' | 'wallet' | 'cash' | 'other' | 'investment'
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  initialBalance: decimal("initial_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  color: text("color").notNull(),
  isPersonal: boolean("is_personal").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  source: text("source").notNull(), // 'manual' | 'notification' | 'voice' | 'photo'
  isPersonal: boolean("is_personal").notNull().default(true),
  status: text("status").notNull().default('pending'), // 'paid' | 'pending'
  paymentMethod: text("payment_method"), // 'debit' | 'credit' | 'cash' | 'pix' | 'transfer'
  creditCardId: varchar("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  tags: jsonb("tags").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit Cards
export const creditCards = pgTable("credit_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(), // 'mastercard' | 'visa' | 'amex' | 'elo' | 'hipercard' | 'other'
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull(),
  closingDay: integer("closing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  linkedAccountId: varchar("linked_account_id").references(() => accounts.id, { onDelete: "set null" }),
  color: text("color").notNull(),
  status: text("status").notNull().default('active'), // 'active' | 'inactive'
  hasAnnualFee: boolean("has_annual_fee").default(false),
  annualFeeValue: decimal("annual_fee_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit Purchases
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditCardId: varchar("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  purchaseDate: timestamp("purchase_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  installments: integer("installments").notNull().default(1),
  installmentValue: decimal("installment_value", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('active'), // 'active' | 'partial_refund' | 'refunded'
  refundedAmount: decimal("refunded_amount", { precision: 12, scale: 2 }),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit Invoice Payments
export const creditPayments = pgTable("credit_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditCardId: varchar("credit_card_id").notNull().references(() => creditCards.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 0-11
  year: integer("year").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  type: text("type").notNull(), // 'total' | 'partial'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Goals
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  target: decimal("target", { precision: 12, scale: 2 }).notNull(),
  current: decimal("current", { precision: 12, scale: 2 }).notNull().default("0"),
  color: text("color").notNull(),
  linkedAccountId: varchar("linked_account_id").references(() => accounts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Investments
export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  yieldDisplay: text("yield_display"), // "+0.85%"
  yieldRate: decimal("yield_rate", { precision: 5, scale: 2 }), // 0.85
  startDate: timestamp("start_date"),
  hasTax: boolean("has_tax").default(false),
  isPersonal: boolean("is_personal").notNull().default(true),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
  lastYieldAppliedAt: timestamp("last_yield_applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  plate: text("plate").notNull(),
  expenses: jsonb("expenses").$type<{
    name: string;
    due: string;
    value: number;
    status: 'ok' | 'warning' | 'expired';
  }[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  date: text("date").notNull(), // Day of month
  logo: text("logo").notNull(),
  color: text("color").notNull(),
  category: text("category").notNull(),
  paymentMethod: text("payment_method"), // 'credit' | 'debit' | 'pix' | 'transfer' | 'cash'
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
  creditCardId: varchar("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
  usage: text("usage"), // 'high' | 'medium' | 'low'
  usageLabel: text("usage_label"),
  lastUsed: timestamp("last_used"),
  isTrial: boolean("is_trial").default(false),
  trialDays: integer("trial_days"),
  futurePrice: decimal("future_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Simulations
export const simulations = pgTable("simulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  downPayment: decimal("down_payment", { precision: 12, scale: 2 }).notNull(),
  installments: integer("installments").notNull(),
  startDate: timestamp("start_date").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull().default('purchase'),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  manualInstallmentValue: decimal("manual_installment_value", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Business Products
export const businessProducts = pgTable("business_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(),
  averageMonthlySales: decimal("average_monthly_sales", { precision: 12, scale: 2 }).notNull(),
  directCosts: jsonb("direct_costs").$type<{ id: string; name: string; value: number }[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Business Settings
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fixedCosts: jsonb("fixed_costs").$type<{ id: string; name: string; value: number }[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'transaction' | 'credit' | 'subscription'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Budget Settings
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  income: decimal("income", { precision: 12, scale: 2 }).notNull().default("0"),
  spendingLimit: decimal("spending_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  alertThresholds: jsonb("alert_thresholds").$type<number[]>().notNull().default(sql`'[70, 90]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default('pending'), // 'pending' | 'confirmed'
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Backups
export const backups = pgTable("backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  size: text("size").notNull(),
  device: text("device").notNull(),
  auto: boolean("auto").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Calendar Settings
export const calendarSettings = pgTable("calendar_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  isConnected: boolean("is_connected").notNull().default(false),
  syncCategories: jsonb("sync_categories").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'income' | 'expense'
  synced: boolean("synced").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== INSERT SCHEMAS =====

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email().optional(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export const insertCreditCardSchema = createInsertSchema(creditCards).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.string().optional().default('active'),
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  purchaseDate: z.union([z.date(), z.string().transform((str) => {
    const d = new Date(str);
    if (d.getFullYear() < 2000) {
      d.setFullYear(d.getFullYear() + 2000);
    }
    return d;
  })]),
});

export const insertCreditPaymentSchema = createInsertSchema(creditPayments).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  paymentDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSimulationSchema = createInsertSchema(simulations).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export const insertBusinessProductSchema = createInsertSchema(businessProducts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackupSchema = createInsertSchema(backups).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  size: z.string().min(1).max(50),
  device: z.string().min(1).max(120),
  auto: z.boolean().optional(),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  userId: true,
  createdAt: true,
  date: true,
}).extend({
  name: z.string().min(1).max(120),
  status: z.enum(['pending', 'confirmed']).optional(),
});

export const updateReferralSchema = z.object({
  status: z.enum(['pending', 'confirmed']).optional(),
  name: z.string().min(1).max(120).optional(),
});

export const insertCalendarSettingsSchema = createInsertSchema(calendarSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isEnabled: z.boolean().optional(),
  isConnected: z.boolean().optional(),
  syncCategories: z.array(z.string()).optional(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
});

export const updateCreditPaymentSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  paymentDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  accountId: z.string().min(1).optional(),
  type: z.enum(['total', 'partial']).optional(),
  month: z.number().int().min(0).max(11).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

// ===== TYPE EXPORTS =====

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type CreditCard = typeof creditCards.$inferSelect;

export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type CreditPurchase = typeof creditPurchases.$inferSelect;

export type InsertCreditPayment = z.infer<typeof insertCreditPaymentSchema>;
export type CreditPayment = typeof creditPayments.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Simulation = typeof simulations.$inferSelect;

export type InsertBusinessProduct = z.infer<typeof insertBusinessProductSchema>;
export type BusinessProduct = typeof businessProducts.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;
