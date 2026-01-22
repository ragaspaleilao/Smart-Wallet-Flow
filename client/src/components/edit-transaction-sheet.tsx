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
  const { updateTransaction, removeTransaction, accounts } = useFinancialStore();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: transaction.amount.toString(),
    category: transaction.category,
    type: transaction.type,
    accountId: transaction.accountId || "",
    date: transaction.date.split('T')[0] // YYYY-MM-DD
  });

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setFormData({
        description: transaction.description,
        amount: transaction.amount.toString(),
        category: transaction.category,
        type: transaction.type,
        accountId: transaction.accountId || "",
        date: transaction.date.split('T')[0]
      });
    }
  }, [open, transaction]);

  const handleSave = () => {
    updateTransaction(transaction.id, {
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category,
      type: formData.type,
      accountId: formData.accountId,
      date: new Date(formData.date).toISOString()
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
                        type="number" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="text-right font-bold"
                    />
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
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Alimentação">Alimentação</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Moradia">Moradia</SelectItem>
                        <SelectItem value="Lazer">Lazer</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Educação">Educação</SelectItem>
                        <SelectItem value="Salário">Salário</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="Serviços">Serviços</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
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
