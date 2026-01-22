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

interface FinancialStore {
  transactions: Transaction[];
  balance: number;
  income: number;
  expense: number;
  
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  removeTransaction: (id: string) => void;
  getTransactionsByMonth: (month: number, year: number) => Transaction[];
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      transactions: [
        // Initial mock data
        { id: '1', amount: 45.90, type: 'expense', category: 'Alimentação', description: 'Padaria Estrela', date: new Date().toISOString(), source: 'manual', isPersonal: true },
        { id: '2', amount: 3500.00, type: 'income', category: 'Salário', description: 'Pagamento Mensal', date: new Date().toISOString(), source: 'manual', isPersonal: true },
      ],
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
