import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { PieChart, TrendingUp, Plus } from "lucide-react";
import { useFinancialStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Investments() {
  const investments = useFinancialStore((state) => state.investments);
  const addInvestment = useFinancialStore((state) => state.addInvestment);
  
  const [open, setOpen] = useState(false);
  const [newInv, setNewInv] = useState({ name: "", value: "", yield: "" });

  const totalInvested = investments.reduce((acc, curr) => acc + curr.value, 0);

  const handleAdd = () => {
    if (!newInv.name || !newInv.value) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    addInvestment({
        name: newInv.name,
        value: Number(newInv.value),
        yield: newInv.yield || "+0.5%", // Default yield if not provided
    });

    setNewInv({ name: "", value: "", yield: "" });
    setOpen(false);
    toast({ title: "Investimento adicionado!" });
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        <div className="flex justify-between items-center pt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patrimônio</h1>
            <p className="text-gray-500 text-sm">Seu dinheiro rendendo</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-full">
                    <Plus className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Novo Investimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome do Ativo</Label>
                        <Input 
                            placeholder="Ex: Tesouro Direto" 
                            value={newInv.name}
                            onChange={(e) => setNewInv({...newInv, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Investido (R$)</Label>
                        <Input 
                            type="number" 
                            placeholder="1000" 
                            value={newInv.value}
                            onChange={(e) => setNewInv({...newInv, value: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Rendimento Estimado (Mensal)</Label>
                        <Input 
                            placeholder="Ex: +0.85%" 
                            value={newInv.yield}
                            onChange={(e) => setNewInv({...newInv, yield: e.target.value})}
                        />
                    </div>
                    <Button className="w-full" onClick={handleAdd}>Salvar Investimento</Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Wealth */}
        <div className="text-center py-8 border-b border-gray-100 dark:border-zinc-800">
          <span className="text-sm font-medium text-gray-500">Total Investido</span>
          <h2 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-2">
            R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-green-600 bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full w-fit mx-auto">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+ R$ {(totalInvested * 0.0085).toFixed(2)} (est. 0.85%)</span>
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
