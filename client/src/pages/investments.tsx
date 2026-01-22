import { MobileLayout } from "@/components/mobile-layout";
import { investments } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { PieChart, TrendingUp, Plus } from "lucide-react";

export default function Investments() {
  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        <div className="flex justify-between items-center pt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patrimônio</h1>
            <p className="text-gray-500 text-sm">Seu dinheiro rendendo</p>
          </div>
          <Button size="icon" variant="outline" className="rounded-full">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Total Wealth */}
        <div className="text-center py-8 border-b border-gray-100 dark:border-zinc-800">
          <span className="text-sm font-medium text-gray-500">Total Investido</span>
          <h2 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-2">R$ 17.450,00</h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-green-600 bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full w-fit mx-auto">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+ R$ 145,30 (0.85%)</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-8 space-y-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Meus Ativos</h3>
          <div className="space-y-4">
            {investments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-black rounded-xl shadow-sm">
                    <PieChart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{inv.name}</h4>
                    <p className="text-xs text-green-600">{inv.yield} este mês</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
             <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Dica Financeira</h4>
             <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Sua reserva de emergência está em 35%. Tente aportar mais R$ 500 este mês para atingir sua meta mais rápido.</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
