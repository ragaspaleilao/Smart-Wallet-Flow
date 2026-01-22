import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Account, AccountType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Landmark, Wallet, Banknote, HelpCircle, Edit2, Check, TrendingUp, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Accounts() {
  const [_, setLocation] = useLocation();
  const { accounts, addAccount, updateAccountBalance, investments } = useFinancialStore();
  
  const [open, setOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<{name: string, type: AccountType, balance: string}>({ 
    name: "", type: "bank", balance: "" 
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");

  const handleAddAccount = () => {
    if (!newAccount.name) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    addAccount({
      name: newAccount.name,
      type: newAccount.type,
      balance: Number(newAccount.balance) || 0,
      initialBalance: Number(newAccount.balance) || 0,
      color: newAccount.type === 'bank' ? 'bg-purple-600' : 'bg-green-600',
      isPersonal: true
    });

    setNewAccount({ name: "", type: "bank", balance: "" });
    setOpen(false);
    toast({ title: "Conta adicionada com sucesso!" });
  };

  const handleUpdateBalance = (id: string) => {
    updateAccountBalance(id, Number(editBalance));
    setEditingId(null);
    toast({ title: "Saldo atualizado!" });
  };

  const startEditing = (acc: Account) => {
    setEditingId(acc.id);
    setEditBalance(acc.balance.toString());
  };

  const getIcon = (type: AccountType) => {
    switch(type) {
      case 'bank': return <Landmark className="w-5 h-5" />;
      case 'wallet': return <Wallet className="w-5 h-5" />;
      case 'cash': return <Banknote className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalInvested = investments.reduce((acc, curr) => acc + curr.value, 0);
  const grandTotal = totalBalance + totalInvested;

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Minhas Finanças</h1>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90">
                    <Plus className="w-6 h-6" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome da Conta</Label>
                        <Input 
                            placeholder="Ex: Nubank, Carteira" 
                            value={newAccount.name}
                            onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select 
                          value={newAccount.type} 
                          onValueChange={(val: AccountType) => setNewAccount({...newAccount, type: val})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank">Conta Bancária</SelectItem>
                            <SelectItem value="wallet">Carteira Digital</SelectItem>
                            <SelectItem value="cash">Dinheiro</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Saldo Inicial (R$)</Label>
                        <Input 
                            type="number"
                            placeholder="0,00" 
                            value={newAccount.balance}
                            onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})}
                        />
                    </div>
                    <Button className="w-full" onClick={handleAddAccount}>Criar Conta</Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grand Total Card */}
        <Card className="p-6 bg-gray-900 text-white border-none shadow-xl mb-8">
           <p className="text-gray-400 text-sm mb-1">Patrimônio Total (Contas + Investimentos)</p>
           <h2 className="text-4xl font-bold">R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
           <div className="mt-4 flex gap-4 text-xs text-gray-400">
             <div>
                <p>Contas</p>
                <p className="text-white font-semibold">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
             <div className="w-px bg-gray-700 h-8" />
             <div>
                <p>Investimentos</p>
                <p className="text-white font-semibold">R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
             </div>
           </div>
        </Card>

        {/* Accounts List */}
        <div className="space-y-6">
           <h3 className="font-semibold text-gray-900 dark:text-white uppercase text-xs tracking-wider">Contas & Dinheiro</h3>
           <div className="space-y-3">
            {accounts.map(acc => (
                <Card key={acc.id} className="p-4 border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl text-white ${acc.type === 'bank' ? 'bg-purple-600' : acc.type === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {getIcon(acc.type)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{acc.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{acc.type === 'bank' ? 'Conta Corrente' : acc.type === 'cash' ? 'Dinheiro' : 'Carteira'}</p>
                    </div>
                    </div>

                    <div className="text-right">
                    {editingId === acc.id ? (
                        <div className="flex items-center gap-2">
                            <Input 
                            type="number" 
                            className="w-24 h-8 text-right" 
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            autoFocus
                            />
                            <Button size="icon" className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600" onClick={() => handleUpdateBalance(acc.id)}>
                            <Check className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 dark:text-white block">
                            R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => startEditing(acc)}>
                            <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                    </div>
                </Card>
            ))}
           </div>

           {/* Investments Link */}
           <div className="pt-2">
            <h3 className="font-semibold text-gray-900 dark:text-white uppercase text-xs tracking-wider mb-3">Investimentos</h3>
            <Link href="/investments">
                <Card className="p-4 border-gray-100 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl text-white bg-orange-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Carteira de Investimentos</h3>
                            <p className="text-xs text-gray-500">{investments.length} ativos cadastrados</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                            R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </Card>
            </Link>
           </div>
        </div>
      </div>
    </MobileLayout>
  );
}
