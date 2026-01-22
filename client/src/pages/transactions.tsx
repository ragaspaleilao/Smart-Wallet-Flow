import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useFinancialStore } from "@/lib/store";
import { format } from "date-fns";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";

export default function Transactions() {
  const transactions = useFinancialStore((state) => state.transactions.filter(t => t.isPersonal));

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 pb-2 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Extrato</h1>
            <Button variant="ghost" size="icon">
              <Filter className="w-5 h-5" />
            </Button>
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

  return (
    <EditTransactionSheet transaction={tx}>
    <div className="flex items-center justify-between py-2 group cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg px-2 -mx-2 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
        }`}>
          {tx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{tx.description}</p>
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
      </div>
    </div>
    </EditTransactionSheet>
  );
}
