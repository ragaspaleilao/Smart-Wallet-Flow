import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  AuthUser,
  UpsertUser,
  Account,
  InsertAccount,
  Transaction,
  InsertTransaction,
  CreditCard,
  InsertCreditCard,
  CreditPurchase,
  InsertCreditPurchase,
  CreditPayment,
  InsertCreditPayment,
  Goal,
  InsertGoal,
  Investment,
  InsertInvestment,
  Vehicle,
  InsertVehicle,
  Subscription,
  InsertSubscription,
  Simulation,
  InsertSimulation,
  BusinessProduct,
  InsertBusinessProduct,
  Category,
  InsertCategory,
  Budget,
  InsertBudget,
} from "@shared/schema";

type BackupRow = typeof schema.backups.$inferSelect;
type ReferralRow = typeof schema.referrals.$inferSelect;
type CalendarSettingsRow = typeof schema.calendarSettings.$inferSelect;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<AuthUser | undefined>;
  upsertUser(user: UpsertUser): Promise<AuthUser>;
  updateUser(id: string, updates: Partial<AuthUser>): Promise<AuthUser | undefined>;

  // Account operations
  getAccounts(userId: string): Promise<Account[]>;
  getAccount(id: string, userId: string): Promise<Account | undefined>;
  createAccount(userId: string, account: InsertAccount): Promise<Account>;
  updateAccount(id: string, userId: string, updates: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: string, userId: string): Promise<boolean>;

  // Transaction operations
  getTransactions(userId: string, filters?: { accountId?: string; type?: string; startDate?: Date; endDate?: Date }): Promise<Transaction[]>;
  getTransaction(id: string, userId: string): Promise<Transaction | undefined>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, userId: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string, userId: string): Promise<boolean>;

  // Credit Card operations
  getCreditCards(userId: string): Promise<CreditCard[]>;
  getCreditCard(id: string, userId: string): Promise<CreditCard | undefined>;
  createCreditCard(userId: string, card: InsertCreditCard): Promise<CreditCard>;
  updateCreditCard(id: string, userId: string, updates: Partial<CreditCard>): Promise<CreditCard | undefined>;
  deleteCreditCard(id: string, userId: string): Promise<boolean>;

  // Credit Purchase operations
  getCreditPurchases(userId: string, cardId?: string): Promise<CreditPurchase[]>;
  getCreditPurchase(id: string, userId: string): Promise<CreditPurchase | undefined>;
  createCreditPurchase(userId: string, purchase: InsertCreditPurchase): Promise<CreditPurchase>;
  updateCreditPurchase(id: string, userId: string, updates: Partial<CreditPurchase>): Promise<CreditPurchase | undefined>;
  deleteCreditPurchase(id: string, userId: string): Promise<boolean>;

  // Credit Payment operations
  getCreditPayments(userId: string, cardId?: string): Promise<CreditPayment[]>;
  getCreditPayment(id: string, userId: string): Promise<CreditPayment | undefined>;
  createCreditPayment(userId: string, payment: InsertCreditPayment): Promise<CreditPayment>;
  updateCreditPayment(id: string, userId: string, updates: Partial<CreditPayment>): Promise<CreditPayment | undefined>;
  deleteCreditPayment(id: string, userId: string): Promise<boolean>;

  // Goal operations
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(userId: string, goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, userId: string, updates: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: string, userId: string): Promise<boolean>;

  // Investment operations
  getInvestments(userId: string): Promise<Investment[]>;
  createInvestment(userId: string, investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, userId: string, updates: Partial<Investment>): Promise<Investment | undefined>;
  deleteInvestment(id: string, userId: string): Promise<boolean>;

  // Vehicle operations
  getVehicles(userId: string): Promise<Vehicle[]>;
  createVehicle(userId: string, vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, userId: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string, userId: string): Promise<boolean>;

  // Subscription operations
  getSubscriptions(userId: string): Promise<Subscription[]>;
  createSubscription(userId: string, subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string, userId: string): Promise<boolean>;

  // Simulation operations
  getSimulations(userId: string): Promise<Simulation[]>;
  createSimulation(userId: string, simulation: InsertSimulation): Promise<Simulation>;
  updateSimulation(id: string, userId: string, updates: Partial<Simulation>): Promise<Simulation | undefined>;
  deleteSimulation(id: string, userId: string): Promise<boolean>;

  // Business Product operations
  getBusinessProducts(userId: string): Promise<BusinessProduct[]>;
  createBusinessProduct(userId: string, product: InsertBusinessProduct): Promise<BusinessProduct>;
  updateBusinessProduct(id: string, userId: string, updates: Partial<BusinessProduct>): Promise<BusinessProduct | undefined>;
  deleteBusinessProduct(id: string, userId: string): Promise<boolean>;

  // Category operations
  getCategories(userId: string, type?: string): Promise<Category[]>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  deleteCategory(id: string, userId: string): Promise<boolean>;

  // Budget operations
  getBudget(userId: string): Promise<Budget | undefined>;
  upsertBudget(userId: string, budget: Partial<InsertBudget>): Promise<Budget>;

  // Business Settings
  getBusinessSettings(userId: string): Promise<any>;
  updateBusinessSettings(userId: string, settings: any): Promise<any>;

  // Backup history
  getBackups(userId: string): Promise<BackupRow[]>;
  createBackup(userId: string, data: { date?: Date; size: string; device: string; auto?: boolean }): Promise<BackupRow>;
  deleteBackup(id: string, userId: string): Promise<boolean>;

  // Referrals
  getReferrals(userId: string): Promise<ReferralRow[]>;
  createReferral(userId: string, data: { name: string; status?: 'pending' | 'confirmed' }): Promise<ReferralRow>;
  updateReferral(id: string, userId: string, updates: { name?: string; status?: 'pending' | 'confirmed' }): Promise<ReferralRow | undefined>;
  deleteReferral(id: string, userId: string): Promise<boolean>;

  // Calendar settings
  getCalendarSettings(userId: string): Promise<CalendarSettingsRow | undefined>;
  upsertCalendarSettings(userId: string, settings: Partial<CalendarSettingsRow>): Promise<CalendarSettingsRow>;

  // Reset all user data
  resetAllData(userId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(pool, { schema });
  }

  // ===== USER OPERATIONS =====

  async getUser(id: string): Promise<AuthUser | undefined> {
    const result = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<AuthUser> {
    const [user] = await this.db
      .insert(schema.users)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<AuthUser>): Promise<AuthUser | undefined> {
    const result = await this.db.update(schema.users).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(schema.users.id, id)).returning();
    return result[0];
  }

  // ===== ACCOUNT OPERATIONS =====

  async getAccounts(userId: string): Promise<Account[]> {
    return await this.db.select().from(schema.accounts).where(eq(schema.accounts.userId, userId)).orderBy(desc(schema.accounts.createdAt));
  }

  async getAccount(id: string, userId: string): Promise<Account | undefined> {
    const result = await this.db.select().from(schema.accounts)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createAccount(userId: string, account: InsertAccount): Promise<Account> {
    const result = await this.db.insert(schema.accounts).values({
      ...account,
      userId,
    }).returning();
    return result[0];
  }

  async updateAccount(id: string, userId: string, updates: Partial<Account>): Promise<Account | undefined> {
    const result = await this.db.update(schema.accounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteAccount(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.accounts)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== TRANSACTION OPERATIONS =====

  async getTransactions(userId: string, filters?: { accountId?: string; type?: string; startDate?: Date; endDate?: Date }): Promise<Transaction[]> {
    let query = this.db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId)).$dynamic();
    
    if (filters?.accountId) {
      query = query.where(eq(schema.transactions.accountId, filters.accountId));
    }
    if (filters?.type) {
      query = query.where(eq(schema.transactions.type, filters.type));
    }
    if (filters?.startDate) {
      query = query.where(gte(schema.transactions.date, filters.startDate.toISOString()));
    }
    if (filters?.endDate) {
      query = query.where(lte(schema.transactions.date, filters.endDate.toISOString()));
    }
    
    return await query.orderBy(desc(schema.transactions.date));
  }

  async getTransaction(id: string, userId: string): Promise<Transaction | undefined> {
    const result = await this.db.select().from(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const result = await this.db.insert(schema.transactions).values({
      ...transaction,
      userId,
    }).returning();
    return result[0];
  }

  async updateTransaction(id: string, userId: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const { id: _id, userId: _userId, createdAt: _createdAt, ...safeUpdates } = updates as any;
    const result = await this.db.update(schema.transactions)
      .set({ ...safeUpdates, updatedAt: new Date() })
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== CREDIT CARD OPERATIONS =====

  async getCreditCards(userId: string): Promise<CreditCard[]> {
    return await this.db.select().from(schema.creditCards).where(eq(schema.creditCards.userId, userId)).orderBy(desc(schema.creditCards.createdAt));
  }

  async getCreditCard(id: string, userId: string): Promise<CreditCard | undefined> {
    const result = await this.db.select().from(schema.creditCards)
      .where(and(eq(schema.creditCards.id, id), eq(schema.creditCards.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createCreditCard(userId: string, card: InsertCreditCard): Promise<CreditCard> {
    const result = await this.db.insert(schema.creditCards).values({
      ...card,
      userId,
    }).returning();
    return result[0];
  }

  async updateCreditCard(id: string, userId: string, updates: Partial<CreditCard>): Promise<CreditCard | undefined> {
    const result = await this.db.update(schema.creditCards)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.creditCards.id, id), eq(schema.creditCards.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteCreditCard(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.creditCards)
      .where(and(eq(schema.creditCards.id, id), eq(schema.creditCards.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== CREDIT PURCHASE OPERATIONS =====

  async getCreditPurchases(userId: string, cardId?: string): Promise<CreditPurchase[]> {
    let query = this.db.select().from(schema.creditPurchases).where(eq(schema.creditPurchases.userId, userId)).$dynamic();
    
    if (cardId) {
      query = query.where(eq(schema.creditPurchases.creditCardId, cardId));
    }
    
    return await query.orderBy(desc(schema.creditPurchases.purchaseDate));
  }

  async getCreditPurchase(id: string, userId: string): Promise<CreditPurchase | undefined> {
    const result = await this.db.select().from(schema.creditPurchases)
      .where(and(eq(schema.creditPurchases.id, id), eq(schema.creditPurchases.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createCreditPurchase(userId: string, purchase: InsertCreditPurchase): Promise<CreditPurchase> {
    const result = await this.db.insert(schema.creditPurchases).values({
      ...purchase,
      userId,
    }).returning();
    return result[0];
  }

  async updateCreditPurchase(id: string, userId: string, updates: Partial<CreditPurchase>): Promise<CreditPurchase | undefined> {
    const result = await this.db.update(schema.creditPurchases)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.creditPurchases.id, id), eq(schema.creditPurchases.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteCreditPurchase(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.creditPurchases)
      .where(and(eq(schema.creditPurchases.id, id), eq(schema.creditPurchases.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== CREDIT PAYMENT OPERATIONS =====

  async getCreditPayments(userId: string, cardId?: string): Promise<CreditPayment[]> {
    let query = this.db.select().from(schema.creditPayments).where(eq(schema.creditPayments.userId, userId)).$dynamic();
    
    if (cardId) {
      query = query.where(eq(schema.creditPayments.creditCardId, cardId));
    }
    
    return await query.orderBy(desc(schema.creditPayments.paymentDate));
  }

  async getCreditPayment(id: string, userId: string): Promise<CreditPayment | undefined> {
    const result = await this.db.select().from(schema.creditPayments)
      .where(and(eq(schema.creditPayments.id, id), eq(schema.creditPayments.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createCreditPayment(userId: string, payment: InsertCreditPayment): Promise<CreditPayment> {
    const result = await this.db.insert(schema.creditPayments).values({
      ...payment,
      userId,
    }).returning();
    return result[0];
  }

  async updateCreditPayment(id: string, userId: string, updates: Partial<CreditPayment>): Promise<CreditPayment | undefined> {
    const result = await this.db.update(schema.creditPayments)
      .set(updates)
      .where(and(eq(schema.creditPayments.id, id), eq(schema.creditPayments.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteCreditPayment(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.creditPayments)
      .where(and(eq(schema.creditPayments.id, id), eq(schema.creditPayments.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== GOAL OPERATIONS =====

  async getGoals(userId: string): Promise<Goal[]> {
    return await this.db.select().from(schema.goals).where(eq(schema.goals.userId, userId)).orderBy(desc(schema.goals.createdAt));
  }

  async createGoal(userId: string, goal: InsertGoal): Promise<Goal> {
    const result = await this.db.insert(schema.goals).values({
      ...goal,
      userId,
    }).returning();
    return result[0];
  }

  async updateGoal(id: string, userId: string, updates: Partial<Goal>): Promise<Goal | undefined> {
    const result = await this.db.update(schema.goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.goals.id, id), eq(schema.goals.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== INVESTMENT OPERATIONS =====

  async getInvestments(userId: string): Promise<Investment[]> {
    return await this.db.select().from(schema.investments).where(eq(schema.investments.userId, userId)).orderBy(desc(schema.investments.createdAt));
  }

  async createInvestment(userId: string, investment: InsertInvestment): Promise<Investment> {
    const result = await this.db.insert(schema.investments).values({
      ...investment,
      userId,
    }).returning();
    return result[0];
  }

  async updateInvestment(id: string, userId: string, updates: Partial<Investment>): Promise<Investment | undefined> {
    const result = await this.db.update(schema.investments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.investments.id, id), eq(schema.investments.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteInvestment(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.investments)
      .where(and(eq(schema.investments.id, id), eq(schema.investments.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== VEHICLE OPERATIONS =====

  async getVehicles(userId: string): Promise<Vehicle[]> {
    return await this.db.select().from(schema.vehicles).where(eq(schema.vehicles.userId, userId)).orderBy(desc(schema.vehicles.createdAt));
  }

  async createVehicle(userId: string, vehicle: InsertVehicle): Promise<Vehicle> {
    const result = await this.db.insert(schema.vehicles).values({
      ...vehicle,
      userId,
    }).returning();
    return result[0];
  }

  async updateVehicle(id: string, userId: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const result = await this.db.update(schema.vehicles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.vehicles.id, id), eq(schema.vehicles.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteVehicle(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.vehicles)
      .where(and(eq(schema.vehicles.id, id), eq(schema.vehicles.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== SUBSCRIPTION OPERATIONS =====

  async getSubscriptions(userId: string): Promise<Subscription[]> {
    return await this.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)).orderBy(desc(schema.subscriptions.createdAt));
  }

  async createSubscription(userId: string, subscription: InsertSubscription): Promise<Subscription> {
    const result = await this.db.insert(schema.subscriptions).values({
      ...subscription,
      userId,
    }).returning();
    return result[0];
  }

  async updateSubscription(id: string, userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const result = await this.db.update(schema.subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteSubscription(id: string, userId: string): Promise<boolean> {
    // First get the subscription to know its name
    const subscription = await this.db.select().from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.userId, userId)));
    
    if (subscription.length === 0) return false;
    
    const subscriptionName = subscription[0].name;
    const searchPattern = `${subscriptionName} (Assinatura)`;
    
    // Delete associated credit purchases with matching description
    await this.db.delete(schema.creditPurchases)
      .where(and(
        eq(schema.creditPurchases.userId, userId),
        eq(schema.creditPurchases.description, searchPattern)
      ));
    
    // Delete associated transactions with matching description
    await this.db.delete(schema.transactions)
      .where(and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.description, searchPattern)
      ));
    
    // Finally delete the subscription
    const result = await this.db.delete(schema.subscriptions)
      .where(and(eq(schema.subscriptions.id, id), eq(schema.subscriptions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== SIMULATION OPERATIONS =====

  async getSimulations(userId: string): Promise<Simulation[]> {
    return await this.db.select().from(schema.simulations).where(eq(schema.simulations.userId, userId)).orderBy(desc(schema.simulations.createdAt));
  }

  async createSimulation(userId: string, simulation: InsertSimulation): Promise<Simulation> {
    const result = await this.db.insert(schema.simulations).values({
      ...simulation,
      userId,
    }).returning();
    return result[0];
  }

  async updateSimulation(id: string, userId: string, updates: Partial<Simulation>): Promise<Simulation | undefined> {
    const result = await this.db.update(schema.simulations)
      .set(updates)
      .where(and(eq(schema.simulations.id, id), eq(schema.simulations.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteSimulation(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.simulations)
      .where(and(eq(schema.simulations.id, id), eq(schema.simulations.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== BUSINESS PRODUCT OPERATIONS =====

  async getBusinessProducts(userId: string): Promise<BusinessProduct[]> {
    return await this.db.select().from(schema.businessProducts).where(eq(schema.businessProducts.userId, userId)).orderBy(desc(schema.businessProducts.createdAt));
  }

  async createBusinessProduct(userId: string, product: InsertBusinessProduct): Promise<BusinessProduct> {
    const result = await this.db.insert(schema.businessProducts).values({
      ...product,
      userId,
    }).returning();
    return result[0];
  }

  async updateBusinessProduct(id: string, userId: string, updates: Partial<BusinessProduct>): Promise<BusinessProduct | undefined> {
    const result = await this.db.update(schema.businessProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.businessProducts.id, id), eq(schema.businessProducts.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteBusinessProduct(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.businessProducts)
      .where(and(eq(schema.businessProducts.id, id), eq(schema.businessProducts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== CATEGORY OPERATIONS =====

  async getCategories(userId: string, type?: string): Promise<Category[]> {
    let query = this.db.select().from(schema.categories).where(eq(schema.categories.userId, userId)).$dynamic();
    
    if (type) {
      query = query.where(eq(schema.categories.type, type));
    }
    
    return await query.orderBy(schema.categories.name);
  }

  async createCategory(userId: string, category: InsertCategory): Promise<Category> {
    const result = await this.db.insert(schema.categories).values({
      ...category,
      userId,
    }).returning();
    return result[0];
  }

  async deleteCategory(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== BUDGET OPERATIONS =====

  async getBudget(userId: string): Promise<Budget | undefined> {
    const result = await this.db.select().from(schema.budgets).where(eq(schema.budgets.userId, userId)).limit(1);
    return result[0];
  }

  async upsertBudget(userId: string, budgetData: Partial<InsertBudget>): Promise<Budget> {
    const existing = await this.getBudget(userId);
    
    if (existing) {
      const result = await this.db.update(schema.budgets)
        .set({ ...budgetData, updatedAt: new Date() })
        .where(eq(schema.budgets.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await this.db.insert(schema.budgets).values({
        income: "0",
        spendingLimit: "0",
        creditLimit: "0",
        ...budgetData,
        userId,
      }).returning();
      return result[0];
    }
  }

  // ===== BUSINESS SETTINGS OPERATIONS =====

  async getBusinessSettings(userId: string): Promise<any> {
    const result = await this.db.select().from(schema.businessSettings).where(eq(schema.businessSettings.userId, userId)).limit(1);
    return result[0] || { fixedCosts: [] };
  }

  async updateBusinessSettings(userId: string, settings: any): Promise<any> {
    const existing = await this.db.select().from(schema.businessSettings).where(eq(schema.businessSettings.userId, userId)).limit(1);
    
    if (existing.length > 0) {
      const result = await this.db.update(schema.businessSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(schema.businessSettings.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await this.db.insert(schema.businessSettings).values({
        ...settings,
        userId,
      }).returning();
      return result[0];
    }
  }

  // ===== BACKUP HISTORY =====

  async getBackups(userId: string): Promise<BackupRow[]> {
    return await this.db.select().from(schema.backups)
      .where(eq(schema.backups.userId, userId))
      .orderBy(desc(schema.backups.date));
  }

  async createBackup(userId: string, data: { date?: Date; size: string; device: string; auto?: boolean }): Promise<BackupRow> {
    const result = await this.db.insert(schema.backups).values({
      userId,
      date: data.date ?? new Date(),
      size: data.size,
      device: data.device,
      auto: data.auto ?? false,
    }).returning();
    return result[0];
  }

  async deleteBackup(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.backups)
      .where(and(eq(schema.backups.id, id), eq(schema.backups.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== REFERRALS =====

  async getReferrals(userId: string): Promise<ReferralRow[]> {
    return await this.db.select().from(schema.referrals)
      .where(eq(schema.referrals.userId, userId))
      .orderBy(desc(schema.referrals.date));
  }

  async createReferral(userId: string, data: { name: string; status?: 'pending' | 'confirmed' }): Promise<ReferralRow> {
    const result = await this.db.insert(schema.referrals).values({
      userId,
      name: data.name,
      status: data.status ?? 'pending',
      date: new Date(),
    }).returning();
    return result[0];
  }

  async updateReferral(id: string, userId: string, updates: { name?: string; status?: 'pending' | 'confirmed' }): Promise<ReferralRow | undefined> {
    const result = await this.db.update(schema.referrals)
      .set(updates)
      .where(and(eq(schema.referrals.id, id), eq(schema.referrals.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteReferral(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(schema.referrals)
      .where(and(eq(schema.referrals.id, id), eq(schema.referrals.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===== CALENDAR SETTINGS =====

  async getCalendarSettings(userId: string): Promise<CalendarSettingsRow | undefined> {
    const result = await this.db.select().from(schema.calendarSettings)
      .where(eq(schema.calendarSettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertCalendarSettings(userId: string, settings: Partial<CalendarSettingsRow>): Promise<CalendarSettingsRow> {
    const existing = await this.getCalendarSettings(userId);
    if (existing) {
      const result = await this.db.update(schema.calendarSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(schema.calendarSettings.userId, userId))
        .returning();
      return result[0];
    }
    const result = await this.db.insert(schema.calendarSettings).values({
      userId,
      isEnabled: settings.isEnabled ?? false,
      isConnected: settings.isConnected ?? false,
      syncCategories: settings.syncCategories ?? [],
      reminderDaysBefore: settings.reminderDaysBefore ?? 1,
    }).returning();
    return result[0];
  }

  // ===== RESET ALL USER DATA =====

  async resetAllData(userId: string): Promise<void> {
    // Delete in order of dependencies (children first)
    await this.db.delete(schema.creditPayments).where(eq(schema.creditPayments.userId, userId));
    await this.db.delete(schema.creditPurchases).where(eq(schema.creditPurchases.userId, userId));
    await this.db.delete(schema.transactions).where(eq(schema.transactions.userId, userId));
    await this.db.delete(schema.creditCards).where(eq(schema.creditCards.userId, userId));
    await this.db.delete(schema.goals).where(eq(schema.goals.userId, userId));
    await this.db.delete(schema.investments).where(eq(schema.investments.userId, userId));
    await this.db.delete(schema.vehicles).where(eq(schema.vehicles.userId, userId));
    await this.db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, userId));
    await this.db.delete(schema.simulations).where(eq(schema.simulations.userId, userId));
    await this.db.delete(schema.businessProducts).where(eq(schema.businessProducts.userId, userId));
    await this.db.delete(schema.categories).where(eq(schema.categories.userId, userId));
    await this.db.delete(schema.budgets).where(eq(schema.budgets.userId, userId));
    await this.db.delete(schema.businessSettings).where(eq(schema.businessSettings.userId, userId));
    await this.db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));

    // Create a default account with R$ 0.00
    await this.db.insert(schema.accounts).values({
      userId,
      name: 'Conta Principal',
      type: 'bank',
      balance: '0.00',
      initialBalance: '0.00',
      color: 'bg-green-600',
      isPersonal: true,
    });
  }
}

export const storage = new DbStorage();
