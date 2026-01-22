import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowUp, ArrowDown, Mic, Camera, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { transactions } from "@/lib/mock-data";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

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
  return (
    <MobileLayout>
      <div className="flex flex-col space-y-6 p-6 pt-12 safe-pb">
        
        {/* Header / Balance */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo disponível</p>
              <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-1">
                R$ 3.450,20
              </h1>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
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
                <p className="text-sm font-bold text-green-700 dark:text-green-300">R$ 5.200</p>
              </div>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl flex items-center space-x-3">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl">
                <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">Saídas</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">R$ 1.749</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Floating-ish feel */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/photo-entry">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-2 border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Foto</span>
            </Button>
          </Link>
          
          <Link href="/voice-entry">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-2 border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Voz</span>
            </Button>
          </Link>

          <Link href="/manual-entry">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group">
              <div className="p-3 bg-primary text-white rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-primary">Manual</span>
            </Button>
          </Link>
        </div>

        {/* Chart Area */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fluxo Mensal</h3>
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
            <Link href="/transactions">
              <span className="text-sm font-medium text-primary hover:text-primary/80">Ver tudo</span>
            </Link>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.category === 'Alimentação' ? 'bg-orange-100 text-orange-600' :
                    tx.category === 'Transporte' ? 'bg-blue-100 text-blue-600' :
                    tx.category === 'Salário' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {tx.category.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.category} • {tx.date}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
