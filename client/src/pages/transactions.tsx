import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft, Table as TableIcon, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useFinancialStore } from "@/lib/store";
import { format, isBefore, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { useState, useMemo } from "react";

export default function Transactions() {
  const allTransactions = useFinancialStore((state) => state.transactions);
  
  // Filter State
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'this-month' | 'next-month' | 'future'>('this-month');

  const transactions = useMemo(() => {
    let filtered = allTransactions.filter(t => t.isPersonal);
    const now = new Date();

    if (filterPeriod === 'this-month') {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        filtered = filtered.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    } else if (filterPeriod === 'next-month') {
        const nextMonth = addMonths(now, 1);
        const start = startOfMonth(nextMonth);
        const end = endOfMonth(nextMonth);
        filtered = filtered.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    } else if (filterPeriod === 'future') {
        filtered = filtered.filter(t => new Date(t.date) > now);
    }
    
    // Sort logic
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, filterPeriod]);

  // Projections
  const projections = useMemo(() => {
      const pendingIncome = transactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const pendingExpense = transactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      return { pendingIncome, pendingExpense, net: pendingIncome - pendingExpense };
  }, [transactions]);

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 pb-2 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Extrato</h1>
            <div className="flex gap-2">
                <Link href="/spreadsheet">
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                        <TableIcon className="w-4 h-4" />
                        Planilha
                    </Button>
                </Link>
            </div>
          </div>
          
          {/* Period Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            <button 
                onClick={() => setFilterPeriod('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Tudo
            </button>
            <button 
                onClick={() => setFilterPeriod('this-month')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'this-month' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Este Mês
            </button>
            <button 
                onClick={() => setFilterPeriod('next-month')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'next-month' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Próximo Mês
            </button>
            <button 
                onClick={() => setFilterPeriod('future')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'future' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Futuro
            </button>
          </div>

          {/* Projections Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-zinc-900 dark:to-black rounded-2xl p-4 text-white shadow-lg mb-4">
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Projeção do Período</h3>
                <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-[10px] text-gray-400 block">A Receber</span>
                    <span className="text-lg font-bold text-green-400">R$ {projections.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-400 block">A Pagar</span>
                    <span className="text-lg font-bold text-red-400">R$ {projections.pendingExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                 <span className="text-xs text-gray-400">Saldo Projetado</span>
                 <span className={`font-bold ${projections.net >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                    R$ {projections.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar..." 
              className="pl-9 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma transação encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-white dark:bg-black py-2">Recentes</h3>
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

function TransactionItem({ tx }: { tx: any }) {
  const accounts = useFinancialStore(state => state.accounts);
  const account = accounts.find(a => a.id === tx.accountId);
  
  const isOverdue = tx.status === 'pending' && isBefore(new Date(tx.date), startOfDay(new Date()));
  const isPending = tx.status === 'pending';

  return (
    <EditTransactionSheet transaction={tx}>
    <div className={`flex items-center justify-between py-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl px-3 -mx-3 transition-colors ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${
          tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
        }`}>
          {tx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
          
          {/* Status Badge on Icon */}
          {isOverdue && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                <AlertCircle className="w-3 h-3 text-white" />
            </div>
          )}
          {!isOverdue && isPending && (
             <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                <Clock className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{tx.description}</p>
            {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">ATRASADO</span>}
            {!isOverdue && isPending && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">PENDENTE</span>}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {tx.category} • {format(new Date(tx.date), 'dd/MM HH:mm')}
            {account && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                <span className="font-medium text-gray-600 dark:text-gray-400">{account.name}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-bold block ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
        </span>
        {isPending ? (
            <span className="text-[10px] text-gray-400 font-medium">Previsto</span>
        ) : (
            <span className="text-[10px] text-green-600 font-medium flex items-center justify-end gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Pago
            </span>
        )}
      </div>
    </div>
    </EditTransactionSheet>
  );
}
