import { useState } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialStore } from "@/lib/store";
import { Wallet, Landmark, ArrowRight } from "lucide-react";

export default function SetupAccounts() {
  const [_, setLocation] = useLocation();
  const { addAccount } = useFinancialStore();
  
  const [accounts, setAccounts] = useState([
    { name: "Nubank", balance: "", type: "bank" as const },
    { name: "Carteira (Dinheiro)", balance: "", type: "cash" as const },
  ]);

  const handleUpdate = (index: number, field: string, value: string) => {
    const newAccounts = [...accounts];
    // @ts-ignore
    newAccounts[index][field] = value;
    setAccounts(newAccounts);
  };

  const handleFinish = () => {
    accounts.forEach(acc => {
      if (acc.balance) {
        addAccount({
          name: acc.name,
          type: acc.type,
          balance: Number(acc.balance),
          initialBalance: Number(acc.balance),
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
        <div className="space-y-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Onde está seu dinheiro?
          </h1>
          <p className="text-gray-500">
            Para começar, diga quanto você tem hoje em cada lugar.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          {accounts.map((acc, idx) => (
            <div key={idx} className="space-y-2">
              <Label className="flex items-center gap-2">
                {acc.type === 'bank' ? <Landmark className="w-4 h-4 text-purple-600" /> : <Wallet className="w-4 h-4 text-green-600" />}
                {acc.name}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                <Input 
                  type="number" 
                  placeholder="0,00"
                  className="pl-10 h-12 text-lg font-medium"
                  value={acc.balance}
                  onChange={(e) => handleUpdate(idx, 'balance', e.target.value)}
                />
              </div>
            </div>
          ))}
          
          <Button variant="outline" className="w-full border-dashed" onClick={() => setAccounts([...accounts, { name: "Outra conta", balance: "", type: "bank" }])}>
            + Adicionar outra conta
          </Button>
        </div>

        <div className="pt-8">
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
