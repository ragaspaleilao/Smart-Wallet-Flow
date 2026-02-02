import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'income' | 'expense';
export type Category = string;

export type AccountType = 'bank' | 'wallet' | 'cash' | 'other' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  color: string;
  isPersonal: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  description: string;
  date: string; // ISO string
  source: 'manual' | 'notification' | 'voice' | 'photo';
  isPersonal: boolean; // true = personal, false = business
  accountId?: string; // Optional for backward compatibility, but should be used going forward
  vehicleId?: string; // Optional link to a vehicle
  paymentMethod?: 'debit' | 'credit' | 'cash' | 'pix' | 'transfer';
  
  // New fields for Spreadsheet View
  status?: 'paid' | 'pending';
  tags?: string[];
  notes?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
  linkedAccountId?: string; // New field to link to an account
}

export interface Investment {
  id: string;
  name: string;
  value: number;
  yield: string; // Display string e.g. "+0.85%"
  yieldRate?: number; // Numeric monthly rate e.g. 0.85
  startDate?: string; // ISO date
  hasTax?: boolean; // Whether IR applies
  isPersonal: boolean;
  accountId?: string; // Link to a wallet/account
  lastYieldAppliedAt?: string; // ISO datetime
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  expenses: {
    name: string;
    due: string;
    value: number;
    status: 'ok' | 'warning' | 'expired';
  }[];
}

export interface BusinessProduct {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  averageMonthlySales: number;
  directCosts: { id: string; name: string; value: number }[];
}

export interface BusinessSettings {
  fixedCosts: { id: string; name: string; value: number }[];
}

export interface Referral {
  id: string;
  name: string;
  status: 'pending' | 'confirmed';
  date: string;
}

export interface Backup {
  id: string;
  date: string;
  size: string;
  device: string;
  auto: boolean;
}

export interface CalendarSettings {
  isEnabled: boolean;
  isConnected: boolean; // Simulates Google OAuth connection
  syncCategories: Category[];
  reminderDaysBefore: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: TransactionType;
  synced: boolean;
}

// --- Credit Card Module Models ---

export interface CreditCard {
  id: string;
  name: string;
  brand: 'mastercard' | 'visa' | 'amex' | 'elo' | 'hipercard' | 'other';
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  linkedAccountId?: string;
  color: string;
  status: 'active' | 'inactive';
  hasAnnualFee?: boolean;
  annualFeeValue?: number;
}

export interface CreditPurchase {
  id: string;
  creditCardId: string;
  purchaseDate: string; // ISO
  totalAmount: number;
  installments: number;
  installmentValue: number;
  category: Category;
  description: string;
  status: 'active' | 'partial_refund' | 'refunded';
  createdAt: string;
  updatedAt: string;
  refundedAmount?: number;
}

export interface CreditInvoicePayment {
  id: string;
  creditCardId: string;
  month: number; // 0-11
  year: number;
  paymentDate: string;
  amount: number;
  accountId: string;
  type: 'total' | 'partial';
}

interface FinancialStore {
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  investments: Investment[];
  vehicles: Vehicle[];
  businessProducts: BusinessProduct[];
  businessSettings: BusinessSettings;

  transactionCategories: string[];
  addTransactionCategory: (name: string) => void;
  removeTransactionCategory: (name: string) => void;

  creditCategories: string[];
  addCreditCategory: (name: string) => void;
  removeCreditCategory: (name: string) => void;

  subscriptionCategories: string[];
  addSubscriptionCategory: (name: string) => void;
  removeSubscriptionCategory: (name: string) => void;

  // Credit Card State
  creditCards: CreditCard[];
  creditPurchases: CreditPurchase[];
  creditPayments: CreditInvoicePayment[];

  // Reset / Seed
  resetAllData: () => void;

  // Credit Card Actions
  addCreditCard: (card: Omit<CreditCard, 'id' | 'status'>) => void;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => void;
  removeCreditCard: (id: string) => void;
  
  addCreditPurchase: (purchase: Omit<CreditPurchase, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateCreditPurchase: (id: string, data: Partial<CreditPurchase>) => void;
  removeCreditPurchase: (id: string) => void;
  
  addCreditPayment: (payment: Omit<CreditInvoicePayment, 'id'>) => void;

  budget: {
    income: number;
    spendingLimit: number;
    creditLimit: number;
    alertThresholds: number[];
  };
  
  // Referral System
  referralCode: string;
  referrals: Referral[];
  premiumUntil: string | null; // ISO string if premium
  addReferral: (referral: Omit<Referral, 'id' | 'date' | 'status'>) => void;

  // Backup System
  backups: Backup[];
  lastBackupDate: string | null;
  isAutoBackupEnabled: boolean;
  addBackup: (backup: Backup) => void;
  toggleAutoBackup: (enabled: boolean) => void;

  // Calendar Integration
  calendarSettings: CalendarSettings;
  calendarEvents: CalendarEvent[];
  updateCalendarSettings: (settings: Partial<CalendarSettings>) => void;
  connectCalendar: () => void;
  disconnectCalendar: () => void;

  balance: number; // Global balance (sum of all accounts)
  income: number;
  expense: number;
  
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccountBalance: (id: string, newBalance: number) => void;
  removeAccount: (id: string) => void;
  
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addInvestment: (inv: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, inv: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  addVehicle: (veh: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, veh: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  
  addBusinessProduct: (product: Omit<BusinessProduct, 'id'>) => void;
  updateBusinessProduct: (id: string, product: Partial<BusinessProduct>) => void;
  removeBusinessProduct: (id: string) => void;
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => void;
  
  updateBudget: (budget: Partial<FinancialStore['budget']>) => void;
  
  getTransactionsByMonth: (month: number, year: number) => Transaction[];

  // Simulation System
  simulations: Simulation[];
  addSimulation: (sim: Omit<Simulation, 'id' | 'createdAt'>) => void;
  updateSimulation: (id: string, sim: Partial<Simulation>) => void;
  removeSimulation: (id: string) => void;
  convertSimulationToReal: (id: string) => void;

  // Subscription System
  subscriptions: Subscription[];
  addSubscription: (sub: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  removeSubscriptionAndCharges: (id: string) => void;
  clearOrphanSubscriptionCharges: () => void;
  resetSubscriptions: () => void;
}

export interface Simulation {
  id: string;
  name: string;
  totalValue: number;
  downPayment: number;
  installments: number;
  startDate: string; // ISO
  category: Category;
  type: 'purchase'; // Expandable later
  createdAt: string;
  interestRate?: number; // Monthly interest rate percentage
  manualInstallmentValue?: number; // User-defined installment value
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  date: string; // Day of month e.g. "15"
  logo: string;
  color: string;
  category: string;
  paymentMethod?: 'credit' | 'debit' | 'pix' | 'transfer' | 'cash';
  accountId?: string;
  creditCardId?: string;
  usage?: 'high' | 'medium' | 'low';
  usageLabel?: string;
  lastUsed?: string;
  isTrial?: boolean;
  trialDays?: number;
  futurePrice?: number;
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      // --- Initial State (Clean for Manual Simulation) ---
      transactionCategories: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros', 'Salário', 'Vendas', 'Serviços', 'Investimento'],
      creditCategories: ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Outros'],
      subscriptionCategories: ['Streaming', 'Música', 'Software', 'Shopping', 'Jogos', 'Outros'],
      simulations: [],
      subscriptions: [],

      creditCards: [],
      creditPurchases: [],
      creditPayments: [],

      transactions: [],
      accounts: [],
      goals: [],
      investments: [],
      vehicles: [],
      businessProducts: [],
      businessSettings: {
        fixedCosts: []
      },
      budget: {
        income: 0,
        spendingLimit: 0,
        creditLimit: 0,
        alertThresholds: [70, 90],
      },
      
      // Referral System Initial State
      referralCode: `USER${Math.floor(1000 + Math.random() * 9000)}`,
      referrals: [], 
      premiumUntil: null, 
      
      // Backup System Initial State
      backups: [],
      lastBackupDate: null,
      isAutoBackupEnabled: false,
      
      // Calendar Integration Initial State
      calendarSettings: {
        isEnabled: false,
        isConnected: false,
        syncCategories: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação'],
        reminderDaysBefore: 1
      },
      calendarEvents: [],

      balance: 0, 
      income: 0,
      expense: 0,

      resetAllData: () => {
        const accounts: Account[] = [
          {
            id: nanoid(),
            name: 'Conta Principal',
            type: 'bank',
            balance: 0,
            initialBalance: 0,
            color: '#22c55e',
            isPersonal: true,
          }
        ];

        set(() => ({
          transactionCategories: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros', 'Salário', 'Vendas', 'Serviços', 'Investimento'],
          creditCategories: ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Outros'],
          subscriptionCategories: ['Streaming', 'Música', 'Software', 'Shopping', 'Jogos', 'Outros'],
          transactions: [],
          accounts,
          goals: [],
          investments: [],
          vehicles: [],

          creditCards: [],
          creditPurchases: [],
          creditPayments: [],

          subscriptions: [],
          simulations: [],

          businessProducts: [],
          businessSettings: { fixedCosts: [] },

          budget: {
            income: 0,
            spendingLimit: 0,
            creditLimit: 0,
            alertThresholds: [70, 90],
          },

          income: 0,
          expense: 0,
          balance: accounts.reduce((acc, curr) => acc + curr.balance, 0),
        }));

        try {
          localStorage.removeItem('finsmart-storage-v2');
        } catch {
          // ignore
        }
      },

      addTransactionCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        const exists = state.transactionCategories.some(c => c.toLowerCase() === cleaned.toLowerCase());
        if (exists) return {};
        return { transactionCategories: [...state.transactionCategories, cleaned].sort((a, b) => a.localeCompare(b, 'pt-BR')) };
      }),

      removeTransactionCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        return { transactionCategories: state.transactionCategories.filter(c => c !== cleaned) };
      }),

      addCreditCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        const exists = state.creditCategories.some(c => c.toLowerCase() === cleaned.toLowerCase());
        if (exists) return {};
        return { creditCategories: [...state.creditCategories, cleaned].sort((a, b) => a.localeCompare(b, 'pt-BR')) };
      }),

      removeCreditCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        return { creditCategories: state.creditCategories.filter(c => c !== cleaned) };
      }),

      addSubscriptionCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        const exists = state.subscriptionCategories.some(c => c.toLowerCase() === cleaned.toLowerCase());
        if (exists) return {};
        return { subscriptionCategories: [...state.subscriptionCategories, cleaned].sort((a, b) => a.localeCompare(b, 'pt-BR')) };
      }),

      removeSubscriptionCategory: (name) => set((state) => {
        const cleaned = (name || '').trim();
        if (!cleaned) return {};
        return { subscriptionCategories: state.subscriptionCategories.filter(c => c !== cleaned) };
      }),

      addSimulation: (simData) => set((state) => ({
        simulations: [...state.simulations, { ...simData, id: nanoid(), createdAt: new Date().toISOString() }]
      })),

      updateSimulation: (id, simData) => set((state) => ({
        simulations: state.simulations.map(s => s.id === id ? { ...s, ...simData } : s)
      })),

      removeSimulation: (id) => set((state) => ({
        simulations: state.simulations.filter(s => s.id !== id)
      })),

      convertSimulationToReal: (id) => {
          const sim = get().simulations.find(s => s.id === id);
          if (!sim) return;

          // Create the down payment transaction if exists
          if (sim.downPayment > 0) {
              get().addTransaction({
                  amount: sim.downPayment,
                  type: 'expense',
                  category: sim.category,
                  description: `${sim.name} (Entrada)`,
                  date: sim.startDate,
                  source: 'manual',
                  isPersonal: true, // Default to personal for now
                  status: 'paid'
              });
          }

          // Create installments
          const installmentValue = (() => {
              if (sim.manualInstallmentValue) return sim.manualInstallmentValue;
              if (sim.interestRate && sim.interestRate > 0) {
                  const pv = sim.totalValue - sim.downPayment;
                  const i = sim.interestRate / 100;
                  const n = sim.installments;
                  if (pv <= 0) return 0;
                  return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
              }
              return (sim.totalValue - sim.downPayment) / sim.installments;
          })();

          for (let i = 0; i < sim.installments; i++) {
              const date = new Date(sim.startDate);
              date.setMonth(date.getMonth() + i + (sim.downPayment > 0 ? 1 : 0)); // If down payment, 1st installment is next month usually
              
              get().addTransaction({
                  amount: installmentValue,
                  type: 'expense',
                  category: sim.category,
                  description: `${sim.name} (${i+1}/${sim.installments})`,
                  date: date.toISOString(),
                  source: 'manual',
                  isPersonal: true,
                  status: 'pending'
              });
          }
          
          get().removeSimulation(id);
      },

      // Subscription Actions
      addSubscription: (subData) => set((state) => ({
        subscriptions: [...(state.subscriptions || []), { ...subData, id: nanoid() }]
      })),

      updateSubscription: (id, subData) => set((state) => ({
        subscriptions: (state.subscriptions || []).map(s => s.id === id ? ({ ...s, ...subData }) : s)
      })),

      removeSubscription: (id) => set((state) => ({
        subscriptions: (state.subscriptions || []).filter(s => s.id !== id)
      })),

      clearOrphanSubscriptionCharges: () => set((state) => {
        const nextCreditPurchases = state.creditPurchases.filter(
          (p) => !String(p.description || '').includes('(Assinatura)')
        );
        const nextTransactions = state.transactions.filter(
          (t) => !String(t.description || '').includes('(Assinatura)')
        );

        return {
          creditPurchases: nextCreditPurchases,
          transactions: nextTransactions,
        };
      }),

      removeSubscriptionAndCharges: (id) => set((state) => {
        const sub = (state.subscriptions || []).find(s => s.id === id);
        const nextSubs = (state.subscriptions || []).filter(s => s.id !== id);

        if (!sub) {
          // If it doesn't exist anymore, keep subscriptions list as-is.
          return { subscriptions: nextSubs };
        }

        const desc = `${sub.name} (Assinatura)`;
        const nextCreditPurchases = state.creditPurchases.filter(p => p.description !== desc);
        const nextTransactions = state.transactions.filter(t => t.description !== desc);

        return {
          subscriptions: nextSubs,
          creditPurchases: nextCreditPurchases,
          transactions: nextTransactions,
        };
      }),
      
      resetSubscriptions: () => set(() => ({
        subscriptions: []
      })),

      // Credit Card Actions
      addCreditCard: (cardData) => set((state) => ({
        creditCards: [...state.creditCards, { ...cardData, id: nanoid(), status: 'active' }]
      })),

      updateCreditCard: (id, data) => set((state) => ({
        creditCards: state.creditCards.map(c => c.id === id ? { ...c, ...data } : c)
      })),

      removeCreditCard: (id) => set((state) => ({
        creditCards: state.creditCards.filter(c => c.id !== id)
      })),

      addCreditPurchase: (purchaseData) => set((state) => ({
        creditPurchases: [...state.creditPurchases, { 
            ...purchaseData, 
            id: nanoid(), 
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }]
      })),

      updateCreditPurchase: (id, data) => set((state) => ({
        creditPurchases: state.creditPurchases.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
      })),

      removeCreditPurchase: (id) => set((state) => ({
        creditPurchases: state.creditPurchases.filter(p => p.id !== id)
      })),

      addCreditPayment: (paymentData) => set((state) => {
          // Add payment record
          const newPayment = { ...paymentData, id: nanoid() };
          
          // Deduct from account balance
          const newAccounts = state.accounts.map(acc => {
              if (acc.id === paymentData.accountId) {
                  return { ...acc, balance: acc.balance - paymentData.amount };
              }
              return acc;
          });

          // Also create a Transaction record for the payment so it shows in extracts
          const paymentTx: Transaction = {
            id: nanoid(),
            amount: paymentData.amount,
            type: 'expense',
            category: 'Outros', // Or 'Pagamento Fatura'
            description: `Pagamento Fatura Cartão`,
            // Consolidação sempre pela data real do pagamento.
            date: String(paymentData.paymentDate || '').length === 10 ? `${paymentData.paymentDate}T12:00:00` : paymentData.paymentDate,
            source: 'manual',
            isPersonal: true,
            accountId: paymentData.accountId,
            status: 'paid'
          };

          return {
              creditPayments: [...state.creditPayments, newPayment],
              accounts: newAccounts,
              transactions: [paymentTx, ...state.transactions],
              balance: newAccounts.reduce((acc, curr) => acc + curr.balance, 0)
          };
      }),

      addTransaction: (txData) => set((state) => {
        const newTx: Transaction = {
          ...txData,
          id: nanoid(),
          date: txData.date || new Date().toISOString(),
        };

        const newTransactions = [newTx, ...state.transactions];
        
        // Update account balance if accountId is provided AND status is 'paid'
        let newAccounts = [...state.accounts];
        if (txData.accountId && (txData.status === 'paid' || !txData.status)) { // Default to paid if undefined for backward compat, though interfaces says optional
          newAccounts = newAccounts.map(acc => {
            if (acc.id === txData.accountId) {
              const amountChange = txData.type === 'income' ? txData.amount : -txData.amount;
              return { ...acc, balance: acc.balance + amountChange };
            }
            return acc;
          });
        }
        
        // Recalculate global totals
        const income = newTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const expense = newTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);

        // Global balance is sum of all account balances
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);

        return {
          transactions: newTransactions,
          accounts: newAccounts,
          income,
          expense,
          balance: globalBalance
        };
      }),

      updateTransaction: (id, txData) => set((state) => {
        const oldTx = state.transactions.find(t => t.id === id);
        if (!oldTx) return {};

        const newTransactions = state.transactions.map(t => 
          t.id === id ? { ...t, ...txData } : t
        );
        
        let newAccounts = [...state.accounts];
        
        // Helper to check if tx affects balance (must be 'paid')
        const wasPaid = oldTx.status === 'paid' || !oldTx.status;
        const isPaid = (txData.status !== undefined ? txData.status === 'paid' : wasPaid); 

        // Revert old transaction effect on balance ONLY if it was paid
        if (oldTx.accountId && wasPaid) {
          newAccounts = newAccounts.map(acc => {
             if (acc.id === oldTx.accountId) {
               const amountChange = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
               return { ...acc, balance: acc.balance + amountChange };
             }
             return acc;
          });
        }
        
        // Apply new transaction effect on balance ONLY if it is paid
        const newTx = newTransactions.find(t => t.id === id)!;
        if (newTx.accountId && isPaid) {
           newAccounts = newAccounts.map(acc => {
             if (acc.id === newTx.accountId) {
               const amountChange = newTx.type === 'income' ? newTx.amount : -newTx.amount;
               return { ...acc, balance: acc.balance + amountChange };
             }
             return acc;
          });
        }

        const income = newTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const expense = newTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);
        
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);

        return {
          transactions: newTransactions,
          accounts: newAccounts,
          income,
          expense,
          balance: globalBalance
        };
      }),

      removeTransaction: (id) => set((state) => {
        const txToRemove = state.transactions.find(t => t.id === id);
        const newTransactions = state.transactions.filter(t => t.id !== id);
        
        let newAccounts = [...state.accounts];
        // Only revert balance if it was 'paid'
        const wasPaid = txToRemove?.status === 'paid' || !txToRemove?.status;

        if (txToRemove && txToRemove.accountId && wasPaid) {
           newAccounts = newAccounts.map(acc => {
            if (acc.id === txToRemove.accountId) {
              // Reverse the operation
              const amountChange = txToRemove.type === 'income' ? -txToRemove.amount : txToRemove.amount;
              return { ...acc, balance: acc.balance + amountChange };
            }
            return acc;
          });
        }

        const income = newTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const expense = newTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);
        
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);

        return {
          transactions: newTransactions,
          accounts: newAccounts,
          income,
          expense,
          balance: globalBalance
        };
      }),

      addAccount: (accData) => set((state) => {
        const newAccount = { ...accData, id: nanoid() };
        const newAccounts = [...state.accounts, newAccount];
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);
        
        return {
          accounts: newAccounts,
          balance: globalBalance
        };
      }),

      updateAccountBalance: (id, newBalance) => set((state) => {
        const newAccounts = state.accounts.map(acc => {
          if (acc.id === id) {
            // When manually updating balance, we must also update initialBalance
            // to maintain consistency if there are no transactions, or to re-baseline.
            // Simplified Logic: New Initial = Old Initial + (New Balance - Old Balance)
            const diff = newBalance - acc.balance;
            return { 
                ...acc, 
                balance: newBalance,
                initialBalance: acc.initialBalance + diff 
            };
          }
          return acc;
        });
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);
        return { accounts: newAccounts, balance: globalBalance };
      }),

      removeAccount: (id) => set((state) => {
        const newAccounts = state.accounts.filter(acc => acc.id !== id);
        const globalBalance = newAccounts.reduce((acc, curr) => acc + curr.balance, 0);
        // Also remove transactions associated with this account? 
        // For safety, let's keep them but maybe orphan them or user manually deletes.
        // Actually, removing account might break things if transactions depend on it.
        // But for mockup simplicity, let's just remove the account.
        return { accounts: newAccounts, balance: globalBalance };
      }),

      addGoal: (goalData) => set((state) => ({
        goals: [...state.goals, { ...goalData, id: nanoid() }]
      })),

      updateGoal: (id, goalData) => set((state) => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...goalData } : g)
      })),

      removeGoal: (id) => set((state) => ({
        goals: state.goals.filter(g => g.id !== id)
      })),

      addInvestment: (invData) => set((state) => ({
        investments: [...state.investments, { ...invData, id: nanoid() }]
      })),

      updateInvestment: (id, invData) => set((state) => ({
        investments: state.investments.map(inv => inv.id === id ? { ...inv, ...invData } : inv)
      })),

      removeInvestment: (id) => set((state) => ({
        investments: state.investments.filter(inv => inv.id !== id)
      })),

      addVehicle: (vehData) => set((state) => ({
        vehicles: [...state.vehicles, { ...vehData, id: nanoid() }]
      })),

      updateVehicle: (id, vehData) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...vehData } : v)
      })),

      removeVehicle: (id) => set((state) => ({
        vehicles: state.vehicles.filter(v => v.id !== id)
      })),
      
      addBusinessProduct: (prodData) => set((state) => ({
        businessProducts: [...state.businessProducts, { ...prodData, id: nanoid() }]
      })),

      addReferral: (refData) => set((state) => ({
        referrals: [...state.referrals, { ...refData, id: nanoid(), status: 'pending', date: new Date().toISOString() }]
      })),
      
      addBackup: (backup) => set((state) => ({
        backups: [backup, ...state.backups],
        lastBackupDate: backup.date
      })),
      
      toggleAutoBackup: (enabled) => set(() => ({
        isAutoBackupEnabled: enabled
      })),

      updateCalendarSettings: (settings) => set((state) => ({
        calendarSettings: { ...state.calendarSettings, ...settings }
      })),
      
      connectCalendar: () => set((state) => ({
        calendarSettings: { ...state.calendarSettings, isConnected: true, isEnabled: true },
        // Simulate syncing some initial events
        calendarEvents: [
            { id: '1', title: 'Aluguel', date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), amount: 1200, type: 'expense', synced: true },
            { id: '2', title: 'Netflix', date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), amount: 55.90, type: 'expense', synced: true },
        ]
      })),
      
      disconnectCalendar: () => set((state) => ({
        calendarSettings: { ...state.calendarSettings, isConnected: false, isEnabled: false },
        calendarEvents: []
      })),

      updateBusinessProduct: (id, prodData) => set((state) => ({
        businessProducts: state.businessProducts.map(p => p.id === id ? { ...p, ...prodData } : p)
      })),
      
      removeBusinessProduct: (id) => set((state) => ({
        businessProducts: state.businessProducts.filter(p => p.id !== id)
      })),

      updateBusinessSettings: (settings) => set((state) => ({
        businessSettings: { ...state.businessSettings, ...settings }
      })),

      updateBudget: (budgetData) => set((state) => ({
        budget: { ...state.budget, ...budgetData }
      })),

      getTransactionsByMonth: (month, year) => {
        return get().transactions.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === month && date.getFullYear() === year;
        });
      }
    }),
    {
      name: 'finsmart-storage-v2',
    }
  )
);
