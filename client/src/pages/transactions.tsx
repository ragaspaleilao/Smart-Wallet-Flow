import { MobileLayout } from "@/components/mobile-layout";
import { transactions } from "@/lib/mock-data";
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function Transactions() {
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
          {/* Group by Date - Mock */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-white dark:bg-black py-2">Hoje</h3>
            {transactions.slice(0, 2).map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-white dark:bg-black py-2">Ontem</h3>
            {transactions.slice(2, 4).map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

function TransactionItem({ tx }: { tx: any }) {
  return (
    <div className="flex items-center justify-between py-2 group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
        }`}>
          {tx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{tx.description}</p>
          <p className="text-xs text-gray-500">{tx.category}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-bold block ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
        </span>
        <span className="text-xs text-gray-400">10:42</span>
      </div>
    </div>
  );
}
