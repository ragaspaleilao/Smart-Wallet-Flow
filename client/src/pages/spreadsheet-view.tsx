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
  XCircle,
  BarChart3
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, isBefore, startOfDay, getMonth, getYear, parseISO, addMonths, startOfYear, endOfYear, subMonths } from "date-fns";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";

export default function SpreadsheetView() {
  const { transactions, accounts, investments, creditCards, creditPurchases, addTransaction, updateTransaction, removeTransaction, addAccount, updateAccountBalance, addInvestment } = useFinancialStore();
  
  // View State
  const [activeTab, setActiveTab] = useState("transactions");
  const [context, setContext] = useState<"personal" | "business">("personal");
  
  // Transaction State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Date Filters
  const [startDate, setStartDate] = useState(format(startOfDay(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM-dd'));

  // Handle URL Params for filtering
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    if (statusParam === 'overdue') {
        setStatusFilter('overdue');
        setStartDate(""); // Clear date filter to show all overdue history
        setEndDate(""); 
    }
  }, []);

  // Projection Filters
  const [projectionYear, setProjectionYear] = useState(new Date().getFullYear().toString());

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
      
      const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'overdue' && t.status === 'pending' && isBefore(new Date(t.date), startOfDay(new Date()))) ||
          (statusFilter === 'pending' && t.status === 'pending') ||
          (statusFilter === 'paid' && t.status === 'paid');

      const txDate = new Date(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      const matchesDate = (!start || txDate >= start) && (!end || txDate <= end);
      
      return matchesContext && matchesSearch && matchesType && matchesDate && matchesStatus;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort Ascending for Spreadsheet (oldest to newest usually better for projections, or keep newest first? User asked for projections, usually chronological order is better)
  }, [transactions, searchTerm, filterType, statusFilter, context, startDate, endDate]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => context === "personal" ? a.isPersonal : !a.isPersonal);
  }, [accounts, context]);

  const filteredInvestments = useMemo(() => {
    return investments.filter(i => context === "personal" ? i.isPersonal : !i.isPersonal);
  }, [investments, context]);

  // Projections Logic
  const projectionData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i); // 0-11
    const year = parseInt(projectionYear);
    
    // Initialize structure
    const data = months.map(month => ({
      month,
      monthName: new Date(year, month, 1).toLocaleString('pt-BR', { month: 'short' }),
      income: 0,
      expense: 0,
      creditCardBill: 0,
      balance: 0
    }));

    // 1. Transactions Logic
    transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && (context === "personal" ? t.isPersonal : !t.isPersonal);
    }).forEach(t => {
        const month = t.date.includes('T') ? new Date(t.date).getMonth() : new Date(t.date + 'T00:00:00').getMonth();
        if (data[month]) {
            if (t.type === 'income') data[month].income += t.amount;
            else data[month].expense += t.amount;
        }
    });

    // 2. Credit Card Logic
    // Filter cards by context (linked account)
    const filteredCards = creditCards.filter(card => {
        const linkedAccount = accounts.find(a => a.id === card.linkedAccountId);
        const isPersonalCard = linkedAccount ? linkedAccount.isPersonal : true; // Default to personal if not linked
        return context === "personal" ? isPersonalCard : !isPersonalCard;
    });
    
    const relevantCardIds = filteredCards.map(c => c.id);

    creditPurchases.filter(p => relevantCardIds.includes(p.creditCardId) && p.status === 'active').forEach(purchase => {
         const card = creditCards.find(c => c.id === purchase.creditCardId);
         if (!card) return;

         const pDate = new Date(purchase.purchaseDate);
         
         // Helper to get invoice date
         const getInvoiceDate = (date: Date) => {
             const d = new Date(date);
             if (d.getDate() >= card.closingDay) {
                 return addMonths(d, 1);
             }
             return d;
         };

         let currentInvoiceDate = getInvoiceDate(pDate);

         for (let i = 1; i <= purchase.installments; i++) {
             if (currentInvoiceDate.getFullYear() === year) {
                 const m = currentInvoiceDate.getMonth();
                 if (data[m]) {
                     data[m].creditCardBill += purchase.installmentValue;
                 }
             }
             currentInvoiceDate = addMonths(currentInvoiceDate, 1);
         }
    });

    // Calculate balances
    data.forEach(d => d.balance = d.income - d.expense - d.creditCardBill);
    
    return data;
  }, [transactions, projectionYear, context, creditCards, creditPurchases, accounts]);

  // Consolidated Logic
  const consolidatedData = useMemo(() => {
    const year = parseInt(projectionYear);
    const months = Array.from({ length: 12 }, (_, i) => i);
    
    // 1. Calculate Initial Balance (Start of Selected Year)
    // We derive this from the Current Balance (which is the source of truth for the user)
    // Start Balance = Current Balance - (All Paid Transactions from Start of Year onwards)
    const filteredAccounts = accounts.filter(a => context === "personal" ? a.isPersonal : !a.isPersonal);
    const currentTotalBalance = filteredAccounts.reduce((acc, curr) => acc + curr.balance, 0);

    // Filter transactions that are PAID and occurred on or after the start of the selected year
    const subsequentTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const isContextMatch = context === "personal" ? t.isPersonal : !t.isPersonal;
        const isPaid = t.status === 'paid'; // Only paid transactions affect balance
        return isContextMatch && isPaid && tDate.getFullYear() >= year;
    });

    let initialBalance = currentTotalBalance;
    
    // Reverse the effect of subsequent transactions to get back to start of year
    subsequentTransactions.forEach(t => {
        // If it was income, we subtract it to go back in time
        if (t.type === 'income') initialBalance -= t.amount;
        // If it was expense, we add it back to go back in time
        else initialBalance += t.amount;
    });

    // 2. Build Monthly Data
    let currentBalance = initialBalance;
    
    return months.map(month => {
        const monthStart = new Date(year, month, 1);
        const monthName = monthStart.toLocaleString('pt-BR', { month: 'long' }); // Full month name
        
        // Filter transactions for this month
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isContextMatch = context === "personal" ? t.isPersonal : !t.isPersonal;
            const isPaid = t.status === 'paid';
            const isSameMonth = tDate.getMonth() === month && tDate.getFullYear() === year;
            return isContextMatch && isPaid && isSameMonth;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const result = income - expense;
        const previousBalance = currentBalance;
        const accumulatedBalance = previousBalance + result;

        // Update current balance for next iteration
        currentBalance = accumulatedBalance;

        return {
            month,
            monthName,
            previousBalance,
            income,
            expense,
            result,
            accumulatedBalance
        };
    });
  }, [transactions, accounts, projectionYear, context]);

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
          
          {/* Context Switcher Hidden for Personal MVP
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
          */}
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
                    value="projections" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-2 text-xs"
                >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Projeções
                </TabsTrigger>
                <TabsTrigger 
                    value="consolidated" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-2 text-xs"
                >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Consolidações
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

                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-7 text-xs w-[120px] border-none bg-transparent shadow-none">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos Status</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="paid">Pagos</SelectItem>
                            <SelectItem value="overdue">Vencidos</SelectItem>
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
                                            value={formatCurrency(row.amount)}
                                            type="text"
                                            inputMode="numeric"
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "");
                                                const numberValue = Number(value) / 100;
                                                updateTransaction(row.id, { amount: numberValue });
                                            }}
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
                                <span className="text-sm font-bold text-green-600">{formatCurrency(totals.income)}</span>
                                <span className="text-[10px] text-green-600/70">A receber: {formatCurrency(totals.pendingIncome)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Despesas</span>
                                <span className="text-sm font-bold text-red-600">{formatCurrency(totals.expense)}</span>
                                <span className="text-[10px] text-red-600/70">A pagar: {formatCurrency(totals.pendingExpense)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Saldo do Período</span>
                                <span className={`text-sm font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatCurrency(totals.balance)}
                                </span>
                            </div>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700"></div>
                        
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">Previsão de Caixa</span>
                            <span className={`text-lg font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(totals.pendingIncome - totals.pendingExpense)}
                            </span>
                            <span className="text-[10px] text-gray-400"> (Receber - Pagar)</span>
                        </div>
                    </div>
                 </div>
            </TabsContent>

            {/* PROJECTIONS VIEW */}
            <TabsContent value="projections" className="h-full m-0 p-0 flex flex-col bg-white dark:bg-black">
                <div className="p-2 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <span className="text-sm font-medium text-gray-500">Ano Base:</span>
                         <Select value={projectionYear} onValueChange={setProjectionYear}>
                            <SelectTrigger className="w-[100px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Receitas</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Despesas</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <Table className="border-collapse w-full min-w-[1200px]">
                        <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10">
                            <TableRow className="border-b border-gray-200 dark:border-zinc-800">
                                <TableHead className="w-[150px] font-bold text-xs h-10 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Categoria</TableHead>
                                {projectionData.map(m => (
                                    <TableHead key={m.month} className="text-center min-w-[100px] text-xs h-10">{m.monthName}</TableHead>
                                ))}
                                <TableHead className="text-right min-w-[120px] font-bold text-xs h-10 bg-gray-100 dark:bg-zinc-800">TOTAL</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Income Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-green-600">
                                    Receitas
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-green-600 font-medium">
                                        {m.income > 0 ? formatCurrency(m.income) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-green-700 bg-gray-50 dark:bg-zinc-900">
                                    {formatCurrency(projectionData.reduce((acc, curr) => acc + curr.income, 0))}
                                </TableCell>
                            </TableRow>

                            {/* Expense Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-red-600">
                                    Despesas
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-red-600 font-medium">
                                        {m.expense > 0 ? formatCurrency(m.expense) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-red-700 bg-gray-50 dark:bg-zinc-900">
                                    {formatCurrency(projectionData.reduce((acc, curr) => acc + curr.expense, 0))}
                                </TableCell>
                            </TableRow>

                            {/* Credit Card Bill Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-purple-600 flex items-center gap-1.5 h-12">
                                    <CreditCard className="w-3 h-3" /> Faturas Cartão
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-purple-600 font-medium">
                                        {m.creditCardBill > 0 ? formatCurrency(m.creditCardBill) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-purple-700 bg-gray-50 dark:bg-zinc-900">
                                    {formatCurrency(projectionData.reduce((acc, curr) => acc + curr.creditCardBill, 0))}
                                </TableCell>
                            </TableRow>

                            {/* Balance Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-14 bg-gray-50/50 font-medium">
                                <TableCell className="font-bold text-xs sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    RESULTADO
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className={`text-center text-xs font-bold ${m.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {m.balance !== 0 ? formatCurrency(m.balance) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className={`text-right text-xs font-bold bg-gray-100 dark:bg-zinc-800 ${projectionData.reduce((acc,curr) => acc + curr.balance, 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                    {formatCurrency(projectionData.reduce((acc, curr) => acc + curr.balance, 0))}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* CONSOLIDATED VIEW */}
            <TabsContent value="consolidated" className="h-full m-0 p-0 flex flex-col bg-white dark:bg-black">
                <div className="p-2 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <span className="text-sm font-medium text-gray-500">Ano Base:</span>
                         <Select value={projectionYear} onValueChange={setProjectionYear}>
                            <SelectTrigger className="w-[100px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-xs text-gray-500 italic">
                        * Considera apenas transações realizadas (pagas).
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <Table className="border-collapse w-full min-w-[1200px]">
                        <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10">
                            <TableRow className="border-b border-gray-200 dark:border-zinc-800">
                                <TableHead className="w-[180px] font-bold text-xs h-10 sticky left-0 bg-gray-50 dark:bg-zinc-900 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Linha</TableHead>
                                {consolidatedData.map(m => (
                                    <TableHead key={m.month} className="text-center min-w-[100px] text-xs h-10 capitalize">{m.monthName}</TableHead>
                                ))}
                                <TableHead className="text-right min-w-[120px] font-bold text-xs h-10 bg-gray-100 dark:bg-zinc-800">TOTAL ANO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Saldo Anterior */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-blue-600">
                                    Saldo Anterior
                                </TableCell>
                                {consolidatedData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-blue-600/80 font-medium">
                                        {formatCurrency(m.previousBalance)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-gray-400 bg-gray-50 dark:bg-zinc-900">-</TableCell>
                            </TableRow>

                            {/* Receitas */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-green-600">
                                    Receitas
                                </TableCell>
                                {consolidatedData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-green-600 font-medium">
                                        {m.income > 0 ? formatCurrency(m.income) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-green-700 bg-gray-50 dark:bg-zinc-900">
                                    {formatCurrency(consolidatedData.reduce((acc, curr) => acc + curr.income, 0))}
                                </TableCell>
                            </TableRow>

                            {/* Despesas */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-red-600">
                                    Despesas
                                </TableCell>
                                {consolidatedData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-red-600 font-medium">
                                        {m.expense > 0 ? formatCurrency(m.expense) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-red-700 bg-gray-50 dark:bg-zinc-900">
                                    {formatCurrency(consolidatedData.reduce((acc, curr) => acc + curr.expense, 0))}
                                </TableCell>
                            </TableRow>

                            {/* Resultado */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 bg-gray-50/30">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-gray-50/30 dark:bg-zinc-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Resultado (rec - desp)
                                </TableCell>
                                {consolidatedData.map(m => (
                                    <TableCell key={m.month} className={`text-center text-xs font-bold ${m.result >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {m.result !== 0 ? m.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                    </TableCell>
                                ))}
                                <TableCell className={`text-right text-xs font-bold bg-gray-100 dark:bg-zinc-900 ${consolidatedData.reduce((acc, curr) => acc + curr.result, 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                    {consolidatedData.reduce((acc, curr) => acc + curr.result, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>

                            {/* Saldo Acumulado */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-14 bg-blue-50/50 dark:bg-blue-900/10 font-medium border-t-2 border-t-blue-100 dark:border-t-blue-900">
                                <TableCell className="font-bold text-xs sticky left-0 bg-blue-50 dark:bg-blue-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-gray-900 dark:text-white">
                                    Saldo Acumulado
                                </TableCell>
                                {consolidatedData.map(m => (
                                    <TableCell key={m.month} className={`text-center text-xs font-bold ${m.accumulatedBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                        {m.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-blue-800 bg-blue-100 dark:bg-blue-900">
                                    {consolidatedData[11]?.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
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
                        {filteredInvestments.map((inv) => {
                            // Logic to resolve display value (same as in Investments page)
                            const linkedAccount = inv.accountId ? accounts.find(a => a.id === inv.accountId) : null;
                            const displayValue = linkedAccount ? linkedAccount.balance : inv.value;

                            return (
                            <TableRow key={inv.id} className="border-b border-gray-100 dark:border-zinc-800 h-10 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                                <TableCell className="p-0">
                                    <input 
                                        className="w-full h-full bg-transparent px-3 text-sm font-medium focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={inv.name}
                                        readOnly // Simplified
                                    />
                                </TableCell>
                                <TableCell className="p-0 px-3 text-right font-mono font-medium text-green-600">
                                    {formatCurrency(displayValue)}
                                </TableCell>
                                <TableCell className="p-0 px-3 text-right text-sm text-gray-600 dark:text-gray-400">
                                    {inv.yield}
                                </TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        )})}
                         {filteredInvestments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500 text-sm">
                                    Nenhum investimento encontrado neste perfil.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Total Footer for Investments */}
                {filteredInvestments.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-3 shadow-lg z-20 sticky bottom-0">
                        <div className="flex justify-between items-center max-w-5xl mx-auto px-4">
                            <span className="text-xs text-gray-500 uppercase font-semibold">Total Investido</span>
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-green-600">
                                    {formatCurrency(filteredInvestments.reduce((acc, inv) => {
                                        const linkedAccount = inv.accountId ? accounts.find(a => a.id === inv.accountId) : null;
                                        return acc + (linkedAccount ? linkedAccount.balance : inv.value);
                                    }, 0))}
                                </span>
                                <span className="text-[10px] text-green-600/70">
                                    + {formatCurrency(filteredInvestments.reduce((acc, inv) => {
                                        const linkedAccount = inv.accountId ? accounts.find(a => a.id === inv.accountId) : null;
                                        const val = linkedAccount ? linkedAccount.balance : inv.value;
                                        // Use approximate yield or stored yield rate
                                        const rate = inv.yieldRate ? (inv.yieldRate / 100) : 0.0085;
                                        return acc + (val * rate);
                                    }, 0))} (est. rendimento)
                                </span>
                            </div>
                        </div>
                    </div>
                )}
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