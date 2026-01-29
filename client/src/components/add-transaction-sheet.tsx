import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialStore, Category } from "@/lib/store";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface AddTransactionSheetProps {
  children: React.ReactNode;
  defaultType?: 'income' | 'expense';
  context?: 'personal' | 'business';
}

export function AddTransactionSheet({ children, defaultType = 'expense', context = 'personal' }: AddTransactionSheetProps) {
  const { addTransaction, accounts, transactionCategories } = useFinancialStore();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "Outros" as Category,
    type: defaultType,
    accountId: "",
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'paid' | 'pending'
  });

  const formatCurrency = (val: string) => {
    const number = val.replace(/\D/g, "");
    return (Number(number) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSave = () => {
    if (!formData.description || !formData.amount) {
        toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
        return;
    }

    const numericAmount = Number(formData.amount.replace(/\D/g, "")) / 100;

    addTransaction({
      description: formData.description,
      amount: numericAmount,
      category: formData.category,
      type: formData.type,
      accountId: formData.accountId || (accounts[0]?.id || ""),
      date: new Date(formData.date).toISOString(),
      source: 'manual',
      isPersonal: context === 'personal',
      status: formData.status
    });
    
    setOpen(false);
    setFormData({
        description: "",
        amount: "",
        category: "Outros" as Category,
        type: defaultType,
        accountId: "",
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    });
    
    toast({ title: "Transação adicionada!" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Nova Transação</SheetTitle>
          <SheetDescription>
            Adicione uma nova receita ou despesa.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 pb-24">
            
            {/* Status Toggle */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Status do Lançamento
                </div>
                <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border border-gray-100 dark:border-zinc-700">
                    <button
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${formData.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setFormData({...formData, status: 'paid'})}
                    >
                        PAGO
                    </button>
                    <button
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${formData.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setFormData({...formData, status: 'pending'})}
                    >
                        PENDENTE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Tipo</Label>
                    <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button 
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === 'income' ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600' : 'text-gray-500'}`}
                            onClick={() => setFormData({...formData, type: 'income'})}
                        >
                            Receita
                        </button>
                        <button 
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.type === 'expense' ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600' : 'text-gray-500'}`}
                            onClick={() => setFormData({...formData, type: 'expense'})}
                        >
                            Despesa
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input 
                        value={formData.amount} 
                        placeholder="R$ 0,00"
                        onChange={(e) => setFormData({...formData, amount: formatCurrency(e.target.value)})}
                        className="text-right font-bold"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                    value={formData.description} 
                    placeholder="Ex: Almoço, Salário..."
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
            </div>

            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(val: Category) => setFormData({...formData, category: val})}>
                    <SelectTrigger data-testid="select-add-category">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {transactionCategories.map((cat) => (
                          <SelectItem key={cat} value={cat} data-testid={`option-add-category-${cat}`}>
                            {cat}
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Conta / Carteira</Label>
                <Select value={formData.accountId} onValueChange={(val) => setFormData({...formData, accountId: val})}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                    type="date"
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                />
            </div>

            <div className="pt-4">
                <Button className="w-full h-12 text-lg" onClick={handleSave}>
                    Adicionar
                </Button>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
