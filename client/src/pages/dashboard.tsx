import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Mic, Camera, Plus, AlertTriangle, Wallet, Brain, Package, Table as TableIcon } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinancialStore } from "@/lib/store";
import { format } from "date-fns";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";

import { ShareButton } from "@/components/share-button";

const chartData = [
  { day: '1', value: 1200 },
  { day: '5', value: 1800 },
  { day: '10', value: 1600 },
  { day: '15', value: 2400 },
  { day: '20', value: 2100 },
  { day: '25', value: 2800 },
  { day: '30', value: 3250 },
];

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
                <ShareButton variant="outline" className="rounded-full border-gray-200 dark:border-zinc-800" />
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex space-x-4">
            <div className="flex-1 bg-green-50 dark:bg-green-950/20 p-3 rounded-2xl flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-xl">
                <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Entradas</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">R$ {personalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              </div>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl flex items-center space-x-3">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl">
                <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">Saídas</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">R$ {personalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              </div>
            </div>
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

        {/* Chart Area */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fluxo Mensal</h3>
                <Link href="/analytics">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 rounded-full text-[10px] font-bold">
                        <Brain className="w-3 h-3 mr-1" />
                        IA
                    </Button>
                </Link>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">+12% vs mês anterior</span>
          </div>
          <div className="h-32 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
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
            {transactions.slice(0, 5).map((tx) => (
              <EditTransactionSheet key={tx.id} transaction={tx}>
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    tx.category === 'Alimentação' ? 'bg-orange-100 text-orange-600' :
                    tx.category === 'Transporte' ? 'bg-blue-100 text-blue-600' :
                    tx.category === 'Salário' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {tx.category.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tx.description}</p>
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
                <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                </span>
              </div>
              </EditTransactionSheet>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
