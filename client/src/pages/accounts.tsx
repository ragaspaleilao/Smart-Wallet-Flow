import { MobileLayout } from "@/components/mobile-layout";
import { formatCurrency } from "@/lib/utils";
import { useFinancialStore, AccountType } from "@/lib/store";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Landmark, Wallet, Banknote, HelpCircle, Edit2, Check, TrendingUp, ChevronRight, Download, PieChart as PieChartIcon, Trash2, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useTransactions } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  initialBalance: number;
  color?: string | null;
  isPersonal: boolean;
};

export default function Accounts() {
  const [_, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const { data: apiAccounts = [], isLoading: accountsLoading, isSuccess: accountsSuccess } = useAccounts();
  const { data: apiTransactions = [], isSuccess: transactionsSuccess } = useTransactions();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  
  const storeData = useFinancialStore();
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);
  
  const accounts: Account[] = accountsSuccess
    ? apiAccounts.map(a => ({
        ...a,
        balance: parseFloat(a.balance),
        initialBalance: parseFloat(a.initialBalance),
      }))
    : storeData.accounts;

  const transactions = transactionsSuccess
    ? apiTransactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount),
      }))
    : storeData.transactions;
    
  const investments = storeData.investments;
  
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  const [newAccount, setNewAccount] = useState<{name: string, type: AccountType, balance: string}>({ 
    name: "", type: "bank", balance: "" 
  });
  const isInvestmentAccount = newAccount.type === 'investment';
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");

  const confirmDelete = (id: string) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (accountToDelete) {
      try {
        await deleteAccountMutation.mutateAsync(accountToDelete);
        setDeleteDialogOpen(false);
        setAccountToDelete(null);
        toast({ title: "Conta removida com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao remover conta", variant: "destructive" });
      }
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        name: newAccount.name,
        type: newAccount.type,
        balance: String(Number(newAccount.balance) || 0),
        initialBalance: String(Number(newAccount.balance) || 0),
        color: newAccount.type === 'investment' ? 'bg-orange-600' : newAccount.type === 'bank' ? 'bg-purple-600' : newAccount.type === 'cash' ? 'bg-green-600' : 'bg-blue-600',
        isPersonal: true
      });

      setNewAccount({ name: "", type: "bank", balance: "" });
      setOpen(false);
      toast({ title: "Conta adicionada com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao adicionar conta", variant: "destructive" });
    }
  };

  const handleUpdateBalance = async (id: string) => {
    try {
      await updateAccountMutation.mutateAsync({ id, data: { balance: editBalance } });
      setEditingId(null);
      toast({ title: "Saldo atualizado!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar saldo", variant: "destructive" });
    }
  };

  const startEditing = (acc: Account) => {
    setEditingId(acc.id);
    setEditBalance(acc.balance.toString());
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'bank': return <Landmark className="w-5 h-5" />;
      case 'wallet': return <Wallet className="w-5 h-5" />;
      case 'cash': return <Banknote className="w-5 h-5" />;
      case 'investment': return <TrendingUp className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  const handleExport = () => {
    const data = {
        accounts,
        investments,
        transactions,
        generatedAt: new Date().toISOString()
    };
    
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    toast({ title: "Relatório exportado!" });
  };

  const totalBalance = accounts.filter(a => a.type !== 'investment').reduce((acc, curr) => acc + curr.balance, 0);
  const totalInvested = accounts.filter(a => a.type === 'investment').reduce((acc, curr) => acc + curr.balance, 0);
  const grandTotal = totalBalance + totalInvested;

  const data = [
    { name: 'Contas', value: totalBalance, color: '#8b5cf6' },
    { name: 'Investimentos', value: totalInvested, color: '#f97316' },
  ].filter(d => d.value > 0);

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
          
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="rounded-full" onClick={handleExport}>
                <Download className="w-5 h-5" />
            </Button>
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
                                <SelectItem value="investment">Conta de investimento</SelectItem>
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
                                data-testid="input-account-initial-balance"
                            />
                            {isInvestmentAccount && (
                              <p className="text-xs text-gray-500" data-testid="text-account-investment-hint">
                                Esta conta não entra no "Saldo disponível" da tela inicial.
                              </p>
                            )}
                        </div>
                        <Button className="w-full" onClick={handleAddAccount}>Criar Conta</Button>
                    </div>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Grand Total Card */}
        <Card className="p-6 bg-gray-900 text-white border-none shadow-xl mb-8 relative overflow-hidden">
           <div className="flex justify-between items-start relative z-10">
               <div>
                    <p className="text-gray-400 text-sm mb-1">Patrimônio Total</p>
                    <h2 className="text-4xl font-bold">{formatCurrency(grandTotal)}</h2>
               </div>
               <div className="h-24 w-24 -mt-4 -mr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
           </div>
           
           <div className="mt-4 flex gap-6 text-xs text-gray-400 relative z-10">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <div>
                    <p>Contas</p>
                    <p className="text-white font-semibold">{formatCurrency(totalBalance)}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <div>
                    <p>Investimentos</p>
                    <p className="text-white font-semibold">{formatCurrency(totalInvested)}</p>
                </div>
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
                    <div className={`p-3 rounded-xl text-white ${acc.type === 'investment' ? 'bg-orange-600' : acc.type === 'bank' ? 'bg-purple-600' : acc.type === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {getIcon(acc.type)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate">{acc.name}</h3>
                          {acc.type === 'investment' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" data-testid={`badge-account-investment-${acc.id}`}>Investimento</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{acc.type === 'bank' ? 'Conta Corrente' : acc.type === 'cash' ? 'Dinheiro' : acc.type === 'wallet' ? 'Carteira' : acc.type === 'investment' ? 'Conta de investimento' : 'Outro'}</p>
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
                            {formatCurrency(acc.balance)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary" onClick={() => startEditing(acc)}>
                            <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => confirmDelete(acc.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                    </div>
                </Card>
            ))}
           </div>
           
           <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A conta e seu saldo serão removidos permanentemente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteAccount}>
                        Remover Conta
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>

           {/* Investments Link */}
           <div className="pt-2 pb-6">
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
                            {formatCurrency(totalInvested)}
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
