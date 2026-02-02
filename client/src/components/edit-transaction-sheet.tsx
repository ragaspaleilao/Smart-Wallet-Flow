import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialStore, Transaction, Category, AccountType, TransactionType } from "@/lib/store";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EditTransactionSheetProps {
  transaction: Transaction;
  children: React.ReactNode;
}

export function EditTransactionSheet({ transaction, children }: EditTransactionSheetProps) {
  const { updateTransaction, removeTransaction, accounts, transactionCategories } = useFinancialStore();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: (transaction.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    category: transaction.category,
    type: transaction.type,
    accountId: transaction.accountId || "",
    date: transaction.date.split('T')[0], // YYYY-MM-DD
    status: transaction.status || 'paid'
  });

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setFormData({
        description: transaction.description,
        amount: (transaction.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        category: transaction.category,
        type: transaction.type,
        accountId: transaction.accountId || "",
        date: transaction.date.split('T')[0],
        status: transaction.status || 'paid'
      });
    }
  }, [open, transaction]);

  const formatCurrency = (val: string) => {
    // Remove all non-numeric characters
    const number = val.replace(/\D/g, "");
    
    if (!number) return "";
    
    // Convert to value (cents)
    const value = Number(number) / 100;
    
    // Format using BRL currency style
    return value.toLocaleString("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
    });
  };

  const handleSave = () => {
    const numericAmount = Number(formData.amount.replace(/\D/g, "")) / 100;

    // Keep YYYY-MM-DD as local midday to avoid timezone shifting to previous day.
    const normalizedDate = String(formData.date || '').length === 10
      ? `${formData.date}T12:00:00`
      : new Date(formData.date).toISOString();

    updateTransaction(transaction.id, {
      description: formData.description,
      amount: numericAmount,
      category: formData.category,
      type: formData.type,
      accountId: formData.accountId,
      date: normalizedDate,
      status: formData.status as 'paid' | 'pending'
    });
    setOpen(false);
    toast({ title: "Transação atualizada!" });
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja apagar esta transação?")) {
        removeTransaction(transaction.id);
        setOpen(false);
        toast({ title: "Transação removida." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="w-full cursor-pointer transition-opacity hover:opacity-70 active:scale-98">
            {children}
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Lançamento</SheetTitle>
          <SheetDescription>
            Faça ajustes nos detalhes da transação.
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
                    <div className="relative">
                        <Input 
                            value={formData.amount} 
                            placeholder="R$ 0,00"
                            inputMode="numeric"
                            onChange={(e) => setFormData({...formData, amount: formatCurrency(e.target.value)})}
                            className="text-right font-bold"
                        />
                        <p className="text-[10px] text-gray-400 text-right mt-1">
                            Digite os centavos (ex: 150000 = R$ 1.500,00)
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
            </div>

            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(val: Category) => setFormData({...formData, category: val})}>
                    <SelectTrigger data-testid="select-edit-category">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {transactionCategories.map((cat) => (
                          <SelectItem key={cat} value={cat} data-testid={`option-edit-category-${cat}`}>
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

            <div className="pt-4 flex gap-3">
                <Button variant="destructive" className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 border-none" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                </Button>
                <Button className="flex-[2]" onClick={handleSave}>
                    Salvar Alterações
                </Button>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
