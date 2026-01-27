import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'income' | 'expense';
export type Category = 'Alimentação' | 'Transporte' | 'Lazer' | 'Saúde' | 'Educação' | 'Moradia' | 'Outros' | 'Salário' | 'Vendas' | 'Serviços' | 'Investimento';

export type AccountType = 'bank' | 'wallet' | 'cash' | 'other';

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
  
  // Credit Card State
  creditCards: CreditCard[];
  creditPurchases: CreditPurchase[];
  creditPayments: CreditInvoicePayment[];

  // Credit Card Actions
  addCreditCard: (card: Omit<CreditCard, 'id' | 'status'>) => void;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => void;
  removeCreditCard: (id: string) => void;
  
  addCreditPurchase: (purchase: Omit<CreditPurchase, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateCreditPurchase: (id: string, data: Partial<CreditPurchase>) => void;
  
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

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      // ... existing state ...
      simulations: [],
      
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

      creditCards: [
        { 
            id: '1', 
            name: 'Nubank Roxinho', 
            brand: 'mastercard', 
            creditLimit: 12000, 
            closingDay: 25, 
            dueDay: 1, 
            color: 'bg-purple-600', 
            status: 'active' 
        },
        { 
            id: '2', 
            name: 'XP Visa Infinite', 
            brand: 'visa', 
            creditLimit: 35000, 
            closingDay: 10, 
            dueDay: 17, 
            color: 'bg-black', 
            status: 'active' 
        }
      ],
      creditPurchases: [
        {
            id: '1',
            creditCardId: '1',
            purchaseDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
            totalAmount: 1890.00,
            installments: 10,
            installmentValue: 189.00,
            category: 'Lazer',
            description: 'Smartphone Novo',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '2',
            creditCardId: '1',
            purchaseDate: new Date().toISOString(),
            totalAmount: 45.90,
            installments: 1,
            installmentValue: 45.90,
            category: 'Alimentação',
            description: 'Ifood Jantar',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
      ],
      creditPayments: [],

      transactions: [
        // Overdue Transaction (TEST)
        { 
            id: 'overdue-1', 
            amount: 150.00, 
            type: 'expense', 
            category: 'Outros', 
            description: 'Conta de Luz (Atrasada)', 
            date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), // 5 days ago
            source: 'manual', 
            isPersonal: true, 
            accountId: '1',
            status: 'pending' // Pending + Past Date = Overdue
        },

        // Current Month (Assuming active usage)
        { id: '1', amount: 45.90, type: 'expense', category: 'Alimentação', description: 'Padaria Estrela', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '2', amount: 3500.00, type: 'income', category: 'Salário', description: 'Pagamento Mensal', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '3', amount: 120.00, type: 'expense', category: 'Lazer', description: 'Cinema e Pipoca', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '2' },
        { id: '4', amount: 850.00, type: 'expense', category: 'Moradia', description: 'Aluguel (Parte)', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        
        // Spike in Food (to trigger AI alert)
        { id: '5', amount: 250.00, type: 'expense', category: 'Alimentação', description: 'Jantar Família', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '6', amount: 180.00, type: 'expense', category: 'Alimentação', description: 'Mercado Semanal', date: new Date().toISOString(), source: 'manual', isPersonal: true, accountId: '1' },

        // Previous Month (for comparison)
        { id: '10', amount: 3500.00, type: 'income', category: 'Salário', description: 'Pagamento Mensal', date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '11', amount: 300.00, type: 'expense', category: 'Alimentação', description: 'Mercado Mensal', date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '12', amount: 150.00, type: 'expense', category: 'Transporte', description: 'Uber', date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        
        // 2 Months Ago
        { id: '20', amount: 3500.00, type: 'income', category: 'Salário', description: 'Pagamento Mensal', date: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
        { id: '21', amount: 400.00, type: 'expense', category: 'Lazer', description: 'Show', date: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(), source: 'manual', isPersonal: true, accountId: '1' },
      ],
      accounts: [
        { id: '1', name: 'Nubank', type: 'bank', balance: 3454.10, initialBalance: 0, color: 'bg-purple-600', isPersonal: true },
        { id: '2', name: 'Carteira', type: 'cash', balance: 150.00, initialBalance: 150.00, color: 'bg-green-600', isPersonal: true },
        { id: '3', name: 'Caixa Empresa', type: 'cash', balance: 500.00, initialBalance: 0, color: 'bg-blue-600', isPersonal: false }, // Business Account
        { id: '4', name: 'Banco PJ', type: 'bank', balance: 2500.00, initialBalance: 0, color: 'bg-indigo-600', isPersonal: false } // Business Account
      ],
      goals: [
        { id: '1', name: "Viagem Fim de Ano", target: 5000, current: 1250, color: "bg-primary" },
        { id: '2', name: "Reserva de Emergência", target: 10000, current: 3500, color: "bg-blue-500" },
      ],
      investments: [
        { id: '1', name: "Tesouro Selic", value: 12450.00, yield: "+0.85%", isPersonal: true },
        { id: '2', name: "CDB Banco X", value: 5000.00, yield: "+0.92%", isPersonal: true },
      ],
      vehicles: [
        { id: '1', name: "Honda Civic 2018", plate: "ABC-1234", expenses: [
          { name: "IPVA", due: "15/02", value: 1250.00, status: "warning" },
          { name: "Seguro", due: "10/05", value: 2100.00, status: "ok" },
        ]},
      ],
      businessProducts: [
        { 
          id: '1', 
          name: 'Hambúrguer Artesanal', 
          category: 'Alimentação', 
          sellingPrice: 32.00, 
          averageMonthlySales: 150,
          directCosts: [
            { id: '1', name: 'Carne (Blend)', value: 8.50 },
            { id: '2', name: 'Pão Brioche', value: 2.50 },
            { id: '3', name: 'Queijo Cheddar', value: 1.80 },
            { id: '4', name: 'Embalagem', value: 1.20 },
          ]
        },
        { 
          id: '2', 
          name: 'Batata Frita Especial', 
          category: 'Alimentação', 
          sellingPrice: 18.00, 
          averageMonthlySales: 100,
          directCosts: [
            { id: '1', name: 'Batata Congelada', value: 4.00 },
            { id: '2', name: 'Óleo', value: 0.50 },
            { id: '3', name: 'Bacon e Cheddar', value: 3.50 },
            { id: '4', name: 'Embalagem', value: 0.80 },
          ]
        }
      ],
      businessSettings: {
        fixedCosts: [
          { id: '1', name: 'Aluguel Ponto', value: 1200.00 },
          { id: '2', name: 'Energia Elétrica', value: 450.00 },
          { id: '3', name: 'Internet', value: 120.00 },
          { id: '4', name: 'MEI (DAS)', value: 75.00 },
        ]
      },
      budget: {
        income: 3500.00,
        spendingLimit: 2500.00,
        creditLimit: 5000.00,
        alertThresholds: [70, 90],
      },
      
      // Referral System Initial State
      referralCode: `USER${Math.floor(1000 + Math.random() * 9000)}`,
      referrals: [
          { id: '1', name: 'Carlos Mendes', status: 'confirmed', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
          { id: '2', name: 'Ana Souza', status: 'pending', date: new Date().toISOString() },
      ], 
      premiumUntil: null, // Not premium yet
      
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

      balance: 3604.10, // Sum of accounts
      income: 3500.00,
      expense: 45.90,

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
            date: paymentData.paymentDate,
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
        
        // Update account balance if accountId is provided
        let newAccounts = [...state.accounts];
        if (txData.accountId) {
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
        
        // Revert old transaction effect on balance
        if (oldTx.accountId) {
          newAccounts = newAccounts.map(acc => {
             if (acc.id === oldTx.accountId) {
               const amountChange = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
               return { ...acc, balance: acc.balance + amountChange };
             }
             return acc;
          });
        }
        
        // Apply new transaction effect on balance
        const newTx = newTransactions.find(t => t.id === id)!;
        if (newTx.accountId) {
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
        if (txToRemove && txToRemove.accountId) {
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
        const newAccounts = state.accounts.map(acc => 
          acc.id === id ? { ...acc, balance: newBalance } : acc
        );
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
            { id: '3', title: 'Salário', date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), amount: 3500, type: 'income', synced: true },
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
      name: 'finsmart-storage',
    }
  )
);
