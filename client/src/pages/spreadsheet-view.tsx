import { useFinancialStore, Transaction, Category, Account, Investment } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Filter, 
  MoreHorizontal,
  CheckCircle2,
  Wallet,
  TrendingUp,
  CreditCard,
  Briefcase,
  User,
  Building2,
  DollarSign,
  AlertCircle,
  Calendar as CalendarIcon,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, isBefore, startOfDay } from "date-fns";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";

export default function SpreadsheetView() {
  const { transactions, accounts, investments, addTransaction, updateTransaction, removeTransaction, addAccount, updateAccountBalance, addInvestment } = useFinancialStore();
  
  // View State
  const [activeTab, setActiveTab] = useState("transactions");
  const [context, setContext] = useState<"personal" | "business">("personal");
  
  // Transaction State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  
  // Date Filters
  const [startDate, setStartDate] = useState(format(startOfDay(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM-dd'));

  // Payment Confirmation State
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Selection Logic
  const toggleSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = (visibleIds: string[]) => {
    if (selectedRows.length === visibleIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(visibleIds);
    }
  };

  // Filtered Data
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesContext = context === "personal" ? t.isPersonal : !t.isPersonal;
      const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || t.type === filterType;
      
      const txDate = new Date(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      const matchesDate = (!start || txDate >= start) && (!end || txDate <= end);
      
      return matchesContext && matchesSearch && matchesType && matchesDate;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort Ascending for Spreadsheet (oldest to newest usually better for projections, or keep newest first? User asked for projections, usually chronological order is better)
  }, [transactions, searchTerm, filterType, context, startDate, endDate]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => context === "personal" ? a.isPersonal : !a.isPersonal);
  }, [accounts, context]);

  const filteredInvestments = useMemo(() => {
    return investments.filter(i => context === "personal" ? i.isPersonal : !i.isPersonal);
  }, [investments, context]);

  // Totals Calculation
  const totals = useMemo(() => {
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);
    
    const pendingIncome = filteredTransactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);
    const pendingExpense = filteredTransactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return { income, expense, balance: income - expense, pendingIncome, pendingExpense };
  }, [filteredTransactions]);

  // Actions
  const handleAddNewTransaction = () => {
    const newTx = {
      amount: 0,
      type: 'expense' as const,
      category: 'Outros' as Category,
      description: 'Nova Transação',
      date: new Date().toISOString(),
      source: 'manual' as const,
      isPersonal: context === 'personal',
      status: 'pending' as const
    };
    addTransaction(newTx);
    toast({ title: "Linha adicionada", description: "Nova transação criada." });
  };

  const handleDeleteSelected = () => {
    if (confirm(`Excluir ${selectedRows.length} itens?`)) {
      selectedRows.forEach(id => removeTransaction(id));
      setSelectedRows([]);
      toast({ title: "Itens excluídos" });
    }
  };

  const initiatePayment = (ids: string[]) => {
      setPendingPaymentIds(ids);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentConfirmOpen(true);
  };

  const confirmPayment = () => {
      pendingPaymentIds.forEach(id => {
          updateTransaction(id, { 
              status: 'paid',
              date: new Date(paymentDate).toISOString() // Update date to payment date
          });
      });
      toast({ title: "Pagamento registrado", description: `${pendingPaymentIds.length} transações atualizadas.` });
      setPaymentConfirmOpen(false);
      setPendingPaymentIds([]);
      if (selectedRows.length > 0) setSelectedRows([]);
  };

  const handleStatusToggle = (id: string, currentStatus: 'paid' | 'pending') => {
      if (currentStatus === 'pending') {
          initiatePayment([id]);
      } else {
          updateTransaction(id, { status: 'pending' });
      }
  };

  const handleAddAccount = () => {
    addAccount({
        name: "Nova Conta",
        type: "bank",
        balance: 0,
        initialBalance: 0,
        color: "bg-gray-500",
        isPersonal: context === "personal"
    });
  };

  const handleAddInvestment = () => {
      addInvestment({
          name: "Novo Investimento",
          value: 0,
          yield: "0%",
          isPersonal: context === "personal"
      });
  }
  
  // Check overdue
  const isOverdue = (dateStr: string, status?: string) => {
      if (status === 'paid') return false;
      return isBefore(new Date(dateStr), startOfDay(new Date()));
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-zinc-800 p-2 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
            <button 
                onClick={() => setContext("personal")}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
                    context === "personal" 
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                )}
            >
                <User className="w-3.5 h-3.5" />
                Pessoal
            </button>
            <button 
                onClick={() => setContext("business")}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
                    context === "business" 
                        ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                )}
            >
                <Building2 className="w-3.5 h-3.5" />
                MEI / Empresa
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input 
                placeholder="Buscar..." 
                className="pl-7 h-8 text-xs bg-gray-100 dark:bg-zinc-800 rounded-md border-none focus:ring-1 focus:ring-green-500 w-48"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex gap-1">
                {activeTab === 'transactions' ? (
                    <AddTransactionSheet context={context}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Adicionar</span>
                        </Button>
                    </AddTransactionSheet>
                ) : (
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={activeTab === 'accounts' ? handleAddAccount : handleAddInvestment}>
                        <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="w-4 h-4" />
                </Button>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 pt-2 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
            <TabsList className="bg-transparent h-9 w-full justify-start p-0 gap-4">
                <TabsTrigger 
                    value="transactions" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-2 text-xs"
                >
                    <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Transações
                </TabsTrigger>
                <TabsTrigger 
                    value="accounts" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-2 text-xs"
                >
                    <Wallet className="w-3.5 h-3.5 mr-1.5" /> Contas & Saldos
                </TabsTrigger>
                <TabsTrigger 
                    value="investments" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-2 text-xs"
                >
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Investimentos
                </TabsTrigger>
            </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-zinc-900/50">
            
            {/* TRANSACTIONS VIEW */}
            <TabsContent value="transactions" className="h-full m-0 p-0 flex flex-col">
                 <div className="p-1 flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black">
                     <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-7 text-xs w-[120px] border-none bg-transparent shadow-none">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            <SelectItem value="income">Receitas</SelectItem>
                            <SelectItem value="expense">Despesas</SelectItem>
                        </SelectContent>
                     </Select>
                     
                     <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1"></div>
                     
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded px-2 py-0.5">
                            <span className="text-[10px] text-gray-500">De:</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-xs border-none p-0 focus:ring-0 w-24"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded px-2 py-0.5">
                            <span className="text-[10px] text-gray-500">Até:</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-xs border-none p-0 focus:ring-0 w-24"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                     </div>

                     {selectedRows.length > 0 && (
                        <>
                            <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1"></div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteSelected}>
                                <Trash2 className="w-3 h-3 mr-1" /> Excluir ({selectedRows.length})
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => initiatePayment(selectedRows)}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar Pago
                            </Button>
                        </>
                     )}
                 </div>

                 <div className="flex-1 overflow-auto relative bg-white dark:bg-black">
                    <Table className="border-collapse w-full min-w-[1000px]">
                        <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
                            <TableRow className="border-b border-gray-200 dark:border-zinc-800 hover:bg-transparent">
                                <TableHead className="w-[40px] px-2 text-center">
                                    <Checkbox 
                                        checked={selectedRows.length === filteredTransactions.length && filteredTransactions.length > 0}
                                        onCheckedChange={() => toggleAll(filteredTransactions.map(t => t.id))}
                                    />
                                </TableHead>
                                <TableHead className="w-[100px] text-xs font-semibold h-9">Data</TableHead>
                                <TableHead className="w-[200px] text-xs font-semibold h-9">Descrição</TableHead>
                                <TableHead className="w-[120px] text-xs font-semibold h-9">Categoria</TableHead>
                                <TableHead className="w-[120px] text-xs font-semibold h-9">Conta</TableHead>
                                <TableHead className="w-[100px] text-xs font-semibold h-9 text-right">Valor</TableHead>
                                <TableHead className="w-[100px] text-xs font-semibold h-9 text-center">Status</TableHead>
                                <TableHead className="w-[150px] text-xs font-semibold h-9">Observações</TableHead>
                                <TableHead className="w-[40px] h-9"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.map((row) => {
                                const overdue = isOverdue(row.date, row.status);
                                return (
                                <TableRow 
                                    key={row.id} 
                                    className={`
                                        border-b border-gray-100 dark:border-zinc-800 h-9 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group text-xs
                                        ${selectedRows.includes(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                        ${overdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                                    `}
                                >
                                    <TableCell className="px-2 text-center py-1">
                                        <Checkbox 
                                            checked={selectedRows.includes(row.id)}
                                            onCheckedChange={() => toggleSelection(row.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <div className="relative w-full h-full flex items-center">
                                            <input 
                                                type="date"
                                                className={`w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 ${overdue ? 'text-red-600 font-medium' : ''}`}
                                                value={row.date.split('T')[0]}
                                                onChange={(e) => updateTransaction(row.id, { date: new Date(e.target.value).toISOString() })}
                                            />
                                            {overdue && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-1 pointer-events-none" title="Atrasado">
                                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <input 
                                            className="w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
                                            value={row.description}
                                            onChange={(e) => updateTransaction(row.id, { description: e.target.value })}
                                        />
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <select 
                                            className="w-full h-full bg-transparent px-1 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
                                            value={row.category}
                                            onChange={(e) => updateTransaction(row.id, { category: e.target.value as Category })}
                                        >
                                            <option value="Alimentação">Alimentação</option>
                                            <option value="Transporte">Transporte</option>
                                            <option value="Lazer">Lazer</option>
                                            <option value="Moradia">Moradia</option>
                                            <option value="Saúde">Saúde</option>
                                            <option value="Educação">Educação</option>
                                            <option value="Salário">Salário</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <select 
                                            className="w-full h-full bg-transparent px-1 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
                                            value={row.accountId || ""}
                                            onChange={(e) => updateTransaction(row.id, { accountId: e.target.value })}
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {filteredAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <input 
                                            className={`w-full h-full bg-transparent px-2 text-xs text-right focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 font-mono ${row.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                                            value={row.amount}
                                            type="number"
                                            step="0.01"
                                            onChange={(e) => updateTransaction(row.id, { amount: parseFloat(e.target.value) })}
                                        />
                                    </TableCell>
                                    <TableCell className="p-0 text-center">
                                        <button 
                                            className={`w-full h-full text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                                                (row.status || 'paid') === 'paid' 
                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                                    : overdue 
                                                        ? 'bg-red-50 text-red-700 hover:bg-red-100 font-bold' 
                                                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                            }`}
                                            onClick={() => handleStatusToggle(row.id, row.status || 'paid')}
                                        >
                                            {(row.status || 'paid') === 'paid' ? (
                                                <>PAGO</>
                                            ) : overdue ? (
                                                <><XCircle className="w-3 h-3" /> ATRASADO</>
                                            ) : (
                                                <>PENDENTE</>
                                            )}
                                        </button>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <input 
                                            className="w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-500"
                                            value={row.notes || ""}
                                            placeholder="Adicionar nota..."
                                            onChange={(e) => updateTransaction(row.id, { notes: e.target.value })}
                                        />
                                    </TableCell>
                                    <TableCell className="p-0 text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-full w-full rounded-none hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(confirm('Excluir este lançamento?')) removeTransaction(row.id);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                 </div>
                 
                 {/* Footer Totals */}
                 <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-3 shadow-lg z-20">
                    <div className="flex justify-between items-center max-w-5xl mx-auto px-4">
                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Receitas</span>
                                <span className="text-sm font-bold text-green-600">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className="text-[10px] text-green-600/70">A receber: R$ {totals.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Despesas</span>
                                <span className="text-sm font-bold text-red-600">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className="text-[10px] text-red-600/70">A pagar: R$ {totals.pendingExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Saldo do Período</span>
                                <span className={`text-sm font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700"></div>
                        
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">Previsão de Caixa</span>
                            <span className={`text-lg font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                R$ {(totals.pendingIncome - totals.pendingExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-gray-400"> (Receber - Pagar)</span>
                        </div>
                    </div>
                 </div>
            </TabsContent>

            {/* ACCOUNTS VIEW */}
            <TabsContent value="accounts" className="h-full m-0 p-0 overflow-auto bg-white dark:bg-black">
                <Table className="border-collapse w-full">
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10">
                        <TableRow className="border-b border-gray-200 dark:border-zinc-800">
                            <TableHead className="w-[200px] text-xs font-semibold h-9">Nome da Conta</TableHead>
                            <TableHead className="w-[150px] text-xs font-semibold h-9">Tipo</TableHead>
                            <TableHead className="w-[150px] text-xs font-semibold h-9 text-right">Saldo Atual</TableHead>
                            <TableHead className="text-xs font-semibold h-9">Cor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAccounts.map((acc) => (
                            <TableRow key={acc.id} className="border-b border-gray-100 dark:border-zinc-800 h-10 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                                <TableCell className="p-0">
                                    <input 
                                        className="w-full h-full bg-transparent px-3 text-sm font-medium focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={acc.name}
                                        readOnly // Simplified for now
                                    />
                                </TableCell>
                                <TableCell className="p-0 px-3 text-sm text-gray-500 capitalize">
                                    {acc.type === 'bank' ? 'Conta Corrente' : acc.type === 'cash' ? 'Dinheiro' : 'Outro'}
                                </TableCell>
                                <TableCell className="p-0 px-3 text-right font-mono font-medium">
                                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="p-0 px-3">
                                    <div className={`w-4 h-4 rounded-full ${acc.color}`} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredAccounts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500 text-sm">
                                    Nenhuma conta encontrada neste perfil.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            {/* INVESTMENTS VIEW */}
            <TabsContent value="investments" className="h-full m-0 p-0 overflow-auto bg-white dark:bg-black">
                <Table className="border-collapse w-full">
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10">
                        <TableRow className="border-b border-gray-200 dark:border-zinc-800">
                            <TableHead className="w-[250px] text-xs font-semibold h-9">Investimento</TableHead>
                            <TableHead className="w-[150px] text-xs font-semibold h-9 text-right">Valor Aplicado</TableHead>
                            <TableHead className="w-[150px] text-xs font-semibold h-9 text-right">Rentabilidade</TableHead>
                            <TableHead className="h-9"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvestments.map((inv) => (
                            <TableRow key={inv.id} className="border-b border-gray-100 dark:border-zinc-800 h-10 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                                <TableCell className="p-0">
                                    <input 
                                        className="w-full h-full bg-transparent px-3 text-sm font-medium focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={inv.name}
                                        readOnly // Simplified
                                    />
                                </TableCell>
                                <TableCell className="p-0 px-3 text-right font-mono font-medium text-green-600">
                                    R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="p-0 px-3 text-right text-sm text-gray-600 dark:text-gray-400">
                                    {inv.yield}
                                </TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        ))}
                         {filteredInvestments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500 text-sm">
                                    Nenhum investimento encontrado neste perfil.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
        </div>
      </Tabs>
      
      {/* Footer Status Bar */}
      <div className="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-1 text-[10px] text-gray-500 flex justify-between items-center z-20">
        <div className="flex gap-4 px-2">
            <span>Perfil: <span className="font-semibold text-gray-700 dark:text-gray-300">{context === 'personal' ? 'Pessoal' : 'Empresarial'}</span></span>
            <span>Total Linhas: {filteredTransactions.length}</span>
        </div>
        <span className="px-2">Autosave ativado</span>
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
        <DialogContent className="max-w-xs rounded-xl">
            <DialogHeader>
                <DialogTitle>Confirmar Pagamento</DialogTitle>
                <DialogDescription>
                    Quando este pagamento foi/será realizado?
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <label className="text-sm font-medium text-gray-500 mb-1.5 block">Data do Pagamento</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        type="date" 
                        value={paymentDate} 
                        onChange={(e) => setPaymentDate(e.target.value)} 
                        className="pl-9"
                    />
                </div>
            </div>
            <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPaymentConfirmOpen(false)}>Cancelar</Button>
                <Button onClick={confirmPayment} className="bg-green-600 hover:bg-green-700">Confirmar Pagamento</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}