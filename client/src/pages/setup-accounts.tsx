import { useState } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialStore } from "@/lib/store";
import { ArrowRight, Trash2 } from "lucide-react";

export default function SetupAccounts() {
  const [_, setLocation] = useLocation();
  const { addAccount } = useFinancialStore();
  
  const [accounts, setAccounts] = useState([
    { name: "Nubank", balance: "", type: "bank" as const },
    { name: "Carteira", balance: "", type: "cash" as const },
  ]);

  const handleUpdate = (index: number, field: string, value: string) => {
    const newAccounts = [...accounts];
    // @ts-ignore
    newAccounts[index][field] = value;
    setAccounts(newAccounts);
  };

  const removeAccount = (index: number) => {
      if (accounts.length > 1) {
          const newAccounts = accounts.filter((_, i) => i !== index);
          setAccounts(newAccounts);
      }
  };

  const handleFinish = () => {
    accounts.forEach(acc => {
      if (acc.balance || acc.balance === "") { // Allow empty balance (treated as 0) if name is set
        addAccount({
          name: acc.name,
          type: acc.type,
          balance: Number(acc.balance) || 0,
          initialBalance: Number(acc.balance) || 0,
          color: "bg-blue-500",
          isPersonal: true
        });
      }
    });
    setLocation("/dashboard");
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex-1 flex flex-col p-8 bg-white dark:bg-black animate-in fade-in duration-500">
        <div className="space-y-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Onde está seu dinheiro?
          </h1>
          <p className="text-gray-500">
            Configure suas contas e carteiras iniciais.
          </p>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pb-4">
          {accounts.map((acc, idx) => (
            <div key={idx} className="space-y-3 bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 relative group">
              {accounts.length > 1 && (
                  <button 
                    onClick={() => removeAccount(idx)}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
              )}
              
              <div className="grid grid-cols-[1fr,110px] gap-2">
                 <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Nome da Conta</Label>
                    <Input 
                        value={acc.name}
                        onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                        className="h-9 bg-white dark:bg-black"
                        placeholder="Ex: Nubank"
                    />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Tipo</Label>
                    <Select value={acc.type} onValueChange={(val) => handleUpdate(idx, 'type', val)}>
                        <SelectTrigger className="h-9 bg-white dark:bg-black">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bank">Banco</SelectItem>
                            <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Saldo Atual</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
                    <Input 
                    type="number" 
                    placeholder="0,00"
                    className="pl-10 h-11 text-lg font-bold bg-white dark:bg-black"
                    value={acc.balance}
                    onChange={(e) => handleUpdate(idx, 'balance', e.target.value)}
                    />
                </div>
              </div>
            </div>
          ))}
          
          <Button variant="outline" className="w-full border-dashed h-12" onClick={() => setAccounts([...accounts, { name: "", balance: "", type: "bank" }])}>
            + Adicionar outra conta
          </Button>
        </div>

        <div className="pt-4 mt-auto">
          <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90" onClick={handleFinish}>
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button className="w-full mt-4 text-sm text-gray-400" onClick={() => setLocation("/dashboard")}>
            Pular essa etapa
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
