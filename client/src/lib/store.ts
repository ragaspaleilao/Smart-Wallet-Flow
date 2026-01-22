import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'income' | 'expense';
export type Category = 'Alimentação' | 'Transporte' | 'Lazer' | 'Saúde' | 'Educação' | 'Outros' | 'Salário' | 'Vendas' | 'Serviços';

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
  paymentMethod?: 'debit' | 'credit' | 'cash' | 'pix' | 'transfer';
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
}

export interface Investment {
  id: string;
  name: string;
  value: number;
  yield: string;
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

interface FinancialStore {
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  investments: Investment[];
  vehicles: Vehicle[];
  budget: {
    income: number;
    spendingLimit: number;
    creditLimit: number;
    alertThresholds: number[];
  };
  
  balance: number; // Global balance (sum of all accounts)
  income: number;
  expense: number;
  
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  removeTransaction: (id: string) => void;
  
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccountBalance: (id: string, newBalance: number) => void;
  
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  addInvestment: (inv: Omit<Investment, 'id'>) => void;
  addVehicle: (veh: Omit<Vehicle, 'id'>) => void;
  
  updateBudget: (budget: Partial<FinancialStore['budget']>) => void;
  
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      transactions: [
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
        { id: '2', name: 'Carteira', type: 'cash', balance: 150.00, initialBalance: 150.00, color: 'bg-green-600', isPersonal: true }
      ],
      goals: [
        { id: '1', name: "Viagem Fim de Ano", target: 5000, current: 1250, color: "bg-primary" },
        { id: '2', name: "Reserva de Emergência", target: 10000, current: 3500, color: "bg-blue-500" },
      ],
      investments: [
        { id: '1', name: "Tesouro Selic", value: 12450.00, yield: "+0.85%" },
        { id: '2', name: "CDB Banco X", value: 5000.00, yield: "+0.92%" },
      ],
      vehicles: [
        { id: '1', name: "Honda Civic 2018", plate: "ABC-1234", expenses: [
          { name: "IPVA", due: "15/02", value: 1250.00, status: "warning" },
          { name: "Seguro", due: "10/05", value: 2100.00, status: "ok" },
        ]},
      ],
      budget: {
        income: 3500.00,
        spendingLimit: 2500.00,
        creditLimit: 5000.00,
        alertThresholds: [70, 90],
      },
      balance: 3604.10, // Sum of accounts
      income: 3500.00,
      expense: 45.90,

      addTransaction: (txData) => set((state) => {
        const newTx: Transaction = {
          ...txData,
          id: nanoid(),
          date: new Date().toISOString(),
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

      addGoal: (goalData) => set((state) => ({
        goals: [...state.goals, { ...goalData, id: nanoid() }]
      })),

      addInvestment: (invData) => set((state) => ({
        investments: [...state.investments, { ...invData, id: nanoid() }]
      })),

      addVehicle: (vehData) => set((state) => ({
        vehicles: [...state.vehicles, { ...vehData, id: nanoid() }]
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
