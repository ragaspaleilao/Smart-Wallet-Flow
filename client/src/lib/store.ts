import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'income' | 'expense';
export type Category = 'Alimentação' | 'Transporte' | 'Lazer' | 'Saúde' | 'Educação' | 'Outros' | 'Salário' | 'Vendas' | 'Serviços';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  description: string;
  date: string; // ISO string
  source: 'manual' | 'notification' | 'voice' | 'photo';
  isPersonal: boolean; // true = personal, false = business
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
  goals: Goal[];
  investments: Investment[];
  vehicles: Vehicle[];
  budget: {
    income: number;
    spendingLimit: number;
    creditLimit: number;
    alertThresholds: number[];
  };
  
  balance: number;
  income: number;
  expense: number;
  
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  removeTransaction: (id: string) => void;
  
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
        { id: '1', amount: 45.90, type: 'expense', category: 'Alimentação', description: 'Padaria Estrela', date: new Date().toISOString(), source: 'manual', isPersonal: true },
        { id: '2', amount: 3500.00, type: 'income', category: 'Salário', description: 'Pagamento Mensal', date: new Date().toISOString(), source: 'manual', isPersonal: true },
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
      balance: 3454.10,
      income: 3500.00,
      expense: 45.90,

      addTransaction: (txData) => set((state) => {
        const newTx: Transaction = {
          ...txData,
          id: nanoid(),
          date: new Date().toISOString(),
        };

        const newTransactions = [newTx, ...state.transactions];
        
        // Recalculate totals
        const income = newTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const expense = newTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);

        return {
          transactions: newTransactions,
          income,
          expense,
          balance: income - expense
        };
      }),

      removeTransaction: (id) => set((state) => {
        const newTransactions = state.transactions.filter(t => t.id !== id);
        
        const income = newTransactions
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        const expense = newTransactions
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);

        return {
          transactions: newTransactions,
          income,
          expense,
          balance: income - expense
        };
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
