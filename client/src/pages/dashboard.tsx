import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Mic, Camera, Plus, AlertTriangle, Wallet, Brain, Package, Table as TableIcon, AlertCircle, Clock, Calculator, Settings } from "lucide-react";
import { useFinancialStore } from "@/lib/store";
import { format, isBefore, startOfDay } from "date-fns";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";

import { ShareButton } from "@/components/share-button";

export default function Dashboard() {
  const { balance, income, expense, transactions: allTransactions } = useFinancialStore();

  // Filter ONLY personal transactions for the dashboard
  const transactions = allTransactions.filter(t => t.isPersonal);

  // Recalculate dashboard totals to reflect only personal finance
  const personalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const personalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Approximate personal balance (assuming store balance mixes both, we might want to split it properly later, 
  // but for now let's just use the store balance as it's the sum of accounts. 
  // Ideally, dashboard should show "Personal Net Worth")
  const { accounts } = useFinancialStore();
  const personalBalance = accounts
    .filter(a => a.isPersonal)
    .reduce((acc, curr) => acc + curr.balance, 0);

  // Overdue Logic
  const overdueTransactions = transactions.filter(t => 
    t.status === 'pending' && isBefore(new Date(t.date), startOfDay(new Date()))
  );
  
  const overdueTotal = overdueTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <MobileLayout>
      <div className="flex flex-col space-y-6 p-6 pt-12 safe-pb">
        
        {/* Header / Balance */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo disponível (Pessoal)</p>
              <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-1">
                R$ {personalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h1>
            </div>
            <div className="flex gap-2">
                <Link href="/settings">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <Settings className="w-5 h-5 text-gray-500" />
                    </Button>
                </Link>
                <ShareButton variant="outline" className="rounded-full border-gray-200 dark:border-zinc-800" />
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex space-x-4">
            <Link href="/transactions?type=income" className="flex-1">
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-2xl flex items-center space-x-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-xl">
                    <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <p className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Entradas</p>
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">R$ {personalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>
                </div>
            </Link>
            <Link href="/transactions?type=expense" className="flex-1">
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl flex items-center space-x-3 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl">
                    <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">Saídas</p>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">R$ {personalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>
                </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions - Floating-ish feel */}
        <div className="grid grid-cols-4 gap-3">
          <Link href="/photo-entry">
            <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Foto</span>
            </Button>
          </Link>
          
          <Link href="/voice-entry">
            <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1">
              <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Voz</span>
            </Button>
          </Link>

          <Link href="/accounts">
            <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Contas</span>
            </Button>
          </Link>

          <Link href="/manual-entry">
            <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group p-1">
              <div className="p-2.5 bg-primary text-white rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-primary">Manual</span>
            </Button>
          </Link>
        </div>

        {/* Management Modules */}
        <div className="grid grid-cols-2 gap-3">
            <Link href="/ai-chat">
                <Card className="p-3 border-none shadow-sm bg-purple-50 dark:bg-purple-900/10 flex items-center gap-3 cursor-pointer hover:bg-purple-100 transition-colors">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
                        <Brain className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mentor IA</h3>
                        <p className="text-[10px] text-gray-500">Conversar agora</p>
                    </div>
                </Card>
            </Link>
            <Link href="/business">
                <Card className="p-3 border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/10 flex items-center gap-3 cursor-pointer hover:bg-indigo-100 transition-colors">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Meu Negócio</h3>
                        <p className="text-[10px] text-gray-500">Gestão para MEI</p>
                    </div>
                </Card>
            </Link>
        </div>

        {/* Alerts */}
        {overdueTransactions.length > 0 && (
            <Link href="/spreadsheet?status=overdue">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                    <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Contas Atrasadas!</h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                        Você tem {overdueTransactions.length} contas vencidas totalizando 
                        <span className="font-bold"> R$ {overdueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>.
                    </p>
                    <p className="text-[10px] font-medium text-red-500 mt-2 flex items-center gap-1 group-hover:underline">
                        Resolver agora <ArrowUp className="w-3 h-3 rotate-45" />
                    </p>
                </div>
              </div>
            </Link>
        )}

        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-orange-700 dark:text-orange-400">Atenção: IPVA Vencendo</h4>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">O IPVA do Honda Civic vence em 3 dias. Valor: R$ 1.250,00</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4 pb-24">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Últimos registros</h3>
            <div className="flex gap-2">
                <Link href="/simulator">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-purple-50 dark:bg-purple-900/20 border-purple-200 hover:bg-purple-100 text-purple-700 dark:text-purple-300">
                        <Calculator className="w-3.5 h-3.5" />
                        Simular Compra
                    </Button>
                </Link>
                <Link href="/spreadsheet">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-white dark:bg-zinc-900 border-green-200 hover:bg-green-50 text-green-700">
                        <TableIcon className="w-3.5 h-3.5" />
                        Ver em Planilha
                    </Button>
                </Link>
                <Link href="/transactions">
                  <span className="text-sm font-medium text-primary hover:text-primary/80 pt-1.5">Ver tudo</span>
                </Link>
            </div>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => {
              const isOverdue = tx.status === 'pending' && isBefore(new Date(tx.date), startOfDay(new Date()));
              return (
              <EditTransactionSheet key={tx.id} transaction={tx}>
              <div className={`flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2 ${isOverdue ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg relative ${
                    tx.category === 'Alimentação' ? 'bg-orange-100 text-orange-600' :
                    tx.category === 'Transporte' ? 'bg-blue-100 text-blue-600' :
                    tx.category === 'Salário' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {tx.category.charAt(0)}
                    {isOverdue && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white dark:border-zinc-950">
                            <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{tx.description}</p>
                        {isOverdue && <span className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">ATRASADO</span>}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {tx.category} • {format(new Date(tx.date), 'dd/MM HH:mm')}
                      {(() => {
                        const account = useFinancialStore.getState().accounts.find(a => a.id === tx.accountId);
                        return account ? (
                          <>
                             <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                             <span className="font-medium text-gray-600 dark:text-gray-400">{account.name}</span>
                          </>
                        ) : null;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                    <span className={`font-bold block ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                    {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                    </span>
                    {tx.status === 'pending' ? (
                         <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-yellow-600'}`}>
                             {isOverdue ? 'Vencido' : 'Pendente'}
                         </span>
                    ) : (
                         <span className="text-[10px] text-green-600 font-medium">Pago</span>
                    )}
                </div>
              </div>
              </EditTransactionSheet>
            )})}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
