import { useFinancialStore, Transaction, Category, Account, Investment } from "@/lib/store";
import { useAccounts as useApiAccounts, useTransactions as useApiTransactions, useUpdateTransaction as useApiUpdateTransaction } from "@/hooks/use-api";
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
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, isBefore, startOfDay, getMonth, getYear, parseISO, addMonths, startOfYear, endOfYear, subMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";

export default function SpreadsheetView() {
  const storeData = useFinancialStore();
  const { addTransaction, updateTransaction: storeUpdateTransaction, removeTransaction, addAccount, updateAccountBalance, addInvestment } = storeData;
  const apiUpdateMutation = useApiUpdateTransaction();
  
  const { data: apiAccounts = [], isSuccess: accountsSuccess } = useApiAccounts();
  const { data: apiTransactions = [], isSuccess: transactionsSuccess, refetch: refetchTransactions } = useApiTransactions();

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    storeUpdateTransaction(id, updates);
    const apiData: Record<string, any> = { ...updates };
    if (apiData.amount !== undefined) {
      apiData.amount = String(apiData.amount);
    }
    if (apiData.date !== undefined && apiData.date) {
      const d = new Date(apiData.date);
      if (!isNaN(d.getTime())) {
        apiData.date = d.toISOString();
      }
    }
    apiUpdateMutation.mutate({ id, data: apiData as any }, {
      onError: () => {
        toast({ title: "Erro ao salvar alteração", variant: "destructive" });
        refetchTransactions();
      }
    });
  }, [storeUpdateTransaction, apiUpdateMutation, refetchTransactions]);

  const rawAccounts: Account[] = useMemo(() => {
    if (accountsSuccess && apiAccounts.length > 0) {
      return apiAccounts.map(a => ({
        ...a,
        type: a.type as Account['type'],
        balance: typeof a.balance === 'string' ? parseFloat(a.balance) : a.balance,
        initialBalance: typeof a.initialBalance === 'string' ? parseFloat(a.initialBalance) : a.initialBalance,
      }));
    }
    return storeData.accounts;
  }, [apiAccounts, storeData.accounts, accountsSuccess]);

  const transactions: Transaction[] = useMemo(() => {
    if (transactionsSuccess && apiTransactions.length > 0) {
      return apiTransactions.map(t => ({
        ...t,
        type: t.type as Transaction['type'],
        status: t.status as Transaction['status'],
        source: t.source as Transaction['source'],
        paymentMethod: (t.paymentMethod || undefined) as Transaction['paymentMethod'],
        accountId: t.accountId || undefined,
        creditCardId: t.creditCardId || undefined,
        vehicleId: t.vehicleId || undefined,
        tags: t.tags || undefined,
        notes: t.notes || undefined,
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
      }));
    }
    return storeData.transactions;
  }, [apiTransactions, storeData.transactions, transactionsSuccess]);

  const accounts: Account[] = useMemo(() => {
    return rawAccounts.map(account => {
      const accountTransactions = transactions.filter(t => 
        t.accountId === account.id && t.status === 'paid'
      );
      const transactionTotal = accountTransactions.reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount;
        if (t.type === 'expense') return sum - t.amount;
        return sum;
      }, 0);
      const calculatedBalance = (account.initialBalance || account.balance) + transactionTotal;
      return { ...account, balance: calculatedBalance };
    });
  }, [rawAccounts, transactions]);

  const { investments, creditCards, creditPurchases, creditPayments } = storeData;
  
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
      previousBalance: 0,
      income: 0,
      expense: 0,
      creditCardBill: 0,
      balance: 0,
      accumulatedBalance: 0
    }));

    // 1. Transactions Logic
    // Projeção = somente transações PENDENTES (por data).
    // Consolidado = somente transações PAGAS.
    // Observação: pagamentos de fatura NÃO são ignorados aqui.
    // Se existir um "Pagamento Fatura" pendente, ele deve entrar como despesa prevista.
    const today = startOfDay(new Date());

    transactions.filter(t => {
        const raw = String(t.date || '');
        const tDate = raw.length === 10 ? new Date(`${raw}T12:00:00`) : new Date(raw);
        const isContextMatch = context === "personal" ? t.isPersonal : !t.isPersonal;
        const isSameYear = tDate.getFullYear() === year;
        const isPending = t.status === 'pending';
        const isFutureOrToday = tDate >= today;
        return isSameYear && isContextMatch && isPending && isFutureOrToday;
    }).forEach(t => {
        const raw = String(t.date || '');
        const month = raw.length === 10 ? new Date(`${raw}T12:00:00`).getMonth() : new Date(raw).getMonth();
        if (data[month]) {
            if (t.type === 'income') data[month].income += t.amount;
            else data[month].expense += t.amount;
        }
    });

    // 2. Credit Card Logic
    // Projeção (planilha) deve mostrar apenas o que está EM ABERTO (pendente) e a partir do mês atual.
    // A competência é o mês da fatura (ciclo/closing day). O vencimento acontece no mês seguinte.
    const relevantCardIds = creditCards.map(c => c.id);

    // Include the invoice month that is currently open.
    // We consider the last month as "current invoice" because its due date is typically in the current month.
    // Example: invoice competency Jan -> due Feb.
    const invoiceMonthStart = startOfMonth(subMonths(today, 1));

    creditPurchases
        .filter(p => relevantCardIds.includes(p.creditCardId) && p.status === 'active')
        .forEach(purchase => {
            const card = creditCards.find(c => c.id === purchase.creditCardId);
            if (!card) return;

            // If this invoice month was already paid for this card, it should NOT appear in projection.
            const isInvoiceMonthPaid = (invoiceMonth: Date) => {
                const nextMonth = addMonths(startOfMonth(invoiceMonth), 1);
                const invoiceDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), card.dueDay);

                // A payment can be done early/on-time/late.
                // What matters is: if there is ANY "Pagamento Fatura" for this card
                // happening between invoice competency month start and the end of the due month,
                // we consider the invoice closed for projection.
                const competencyStart = startOfMonth(invoiceMonth);
                const dueMonthEnd = endOfMonth(invoiceDueDate);

                const hasPaymentRecordForInvoiceMonth = (creditPayments || [])
                  .filter(p => p.creditCardId === card.id)
                  .filter(p => {
                    const paymentCompetence = new Date(Number(p.year), Number(p.month), 1);
                    return isSameMonth(paymentCompetence, invoiceMonth);
                  })
                  .some(p => {
                    const raw = String(p.paymentDate || '');
                    const payDate = raw.length === 10 ? new Date(`${raw}T12:00:00`) : new Date(raw);
                    return payDate.getTime() >= competencyStart.getTime() && payDate.getTime() <= dueMonthEnd.getTime();
                  });

                // Backward compatibility: if older data doesn't have creditPayments, fall back to transaction scan.
                const paymentTx = transactions
                  .filter(t => (context === "personal" ? t.isPersonal : !t.isPersonal))
                  .filter(t => t.status === 'paid')
                  .filter(t => t.creditCardId === card.id)
                  .filter(t => t.description.toLowerCase().includes('pagamento fatura'))
                  .filter(t => {
                    const raw = String(t.date || '');
                    const d = raw.length === 10 ? new Date(`${raw}T12:00:00`) : new Date(raw);
                    return d.getTime() >= competencyStart.getTime() && d.getTime() <= dueMonthEnd.getTime();
                  })
                  .find(Boolean);

                return hasPaymentRecordForInvoiceMonth || Boolean(paymentTx);
            };

            // Normalize YYYY-MM-DD to local midday to avoid timezone shifting the day/month.
            const pDate = (() => {
                const raw = String(purchase.purchaseDate || '');
                if (raw.length === 10) return new Date(`${raw}T12:00:00`);
                return new Date(raw);
            })();

            // Helper to get invoice month competency based on closing day.
            // Rule: if purchase day <= closingDay => belongs to previous month; else belongs to same month.
            const getInvoiceDate = (date: Date) => {
                const d = new Date(date);
                if (d.getDate() <= card.closingDay) {
                    return subMonths(d, 1);
                }
                return d;
            };

            // Competency month for 1st installment.
            let currentInvoiceDate = startOfMonth(getInvoiceDate(pDate));

            for (let i = 1; i <= purchase.installments; i++) {
                const isInSelectedYear = currentInvoiceDate.getFullYear() === year;
                const isCurrentOrFuture = !isBefore(currentInvoiceDate, invoiceMonthStart);
                const isPaidForThatInvoiceMonth = isInvoiceMonthPaid(currentInvoiceDate);

                if (isInSelectedYear && isCurrentOrFuture && !isPaidForThatInvoiceMonth) {
                    const m = currentInvoiceDate.getMonth();
                    if (data[m]) {
                        data[m].creditCardBill += purchase.installmentValue;
                    }
                }

                currentInvoiceDate = startOfMonth(addMonths(currentInvoiceDate, 1));
            }
        });

    // Add Annual Fees to projections
    // Anuidade mensal deve seguir a mesma regra: apenas a partir do mês atual (projeção) e no ano selecionado.
    relevantCardIds.forEach(cardId => {
        const card = creditCards.find(c => c.id === cardId);
        if (!card || !card.hasAnnualFee || !card.annualFeeValue || card.annualFeeValue <= 0) return;

        const feeValue = card.annualFeeValue;

        data.forEach((monthData) => {
            const competencyMonth = new Date(year, monthData.month, 1);
            const isCurrentOrFuture = !isBefore(competencyMonth, invoiceMonthStart);
            if (isCurrentOrFuture) {
                monthData.creditCardBill += feeValue;
            }
        });
    });

    // In projections, we must include the CURRENT open invoice month (competency) even if
    // some purchases have purchaseDate stored as YYYY-MM-DD (local). Normalizing to midday
    // avoids timezone shifts that can drop items into the wrong month.

    // Calculate balances + running cash (previous balance + result)
    // Starting balance = current total balance minus all paid tx from selected year onwards (same approach used in Consolidated)
    const filteredAccounts = accounts.filter(a => context === "personal" ? a.isPersonal : !a.isPersonal);
    const currentTotalBalance = filteredAccounts.reduce((acc, curr) => acc + curr.balance, 0);

    const subsequentPaid = transactions.filter(t => {
      const tDate = new Date(t.date);
      const isContextMatch = context === "personal" ? t.isPersonal : !t.isPersonal;
      const isPaid = t.status === 'paid';
      return isContextMatch && isPaid && tDate.getFullYear() >= year;
    });

    let initialBalance = currentTotalBalance;
    subsequentPaid.forEach(t => {
      if (t.type === 'income') initialBalance -= t.amount;
      else initialBalance += t.amount;
    });

    let running = initialBalance;
    data.forEach(d => {
      const result = d.income - d.expense - d.creditCardBill;
      d.previousBalance = running;
      d.balance = result;
      d.accumulatedBalance = running + result;
      running = d.accumulatedBalance;
    });

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
          // Keep YYYY-MM-DD as local midday to avoid timezone shifting to previous day.
          const normalizedPaymentDate = String(paymentDate || '').length === 10
            ? `${paymentDate}T12:00:00`
            : new Date(paymentDate).toISOString();

          updateTransaction(id, { 
              status: 'paid',
              date: normalizedPaymentDate
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
        <div className="px-2 pt-2 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-transparent h-9 w-max justify-start p-0 gap-4 flex-nowrap">
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
                                            {(() => {
                                              const cats = storeData.transactionCategories || [];
                                              const allCats = cats.includes(row.category) ? cats : [row.category, ...cats];
                                              return allCats.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                              ));
                                            })()}
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
                 <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-2 sm:p-3 shadow-lg z-20">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-between sm:items-center max-w-5xl mx-auto px-1 sm:px-4">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold truncate">Total Receitas</span>
                            <span className="text-xs sm:text-sm font-bold text-green-600 truncate">{formatCurrency(totals.income)}</span>
                            <span className="text-[9px] sm:text-[10px] text-green-600/70 truncate">A receber: {formatCurrency(totals.pendingIncome)}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold truncate">Total Despesas</span>
                            <span className="text-xs sm:text-sm font-bold text-red-600 truncate">{formatCurrency(totals.expense)}</span>
                            <span className="text-[9px] sm:text-[10px] text-red-600/70 truncate">A pagar: {formatCurrency(totals.pendingExpense)}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold truncate">Saldo do Período</span>
                            <span className={`text-xs sm:text-sm font-bold truncate ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(totals.balance)}
                            </span>
                        </div>
                        
                        <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-zinc-700"></div>
                        
                        <div className="flex flex-col min-w-0 sm:items-end">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold truncate">Previsão de Caixa</span>
                            <span className={`text-sm sm:text-lg font-bold truncate ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(totals.pendingIncome - totals.pendingExpense)}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-gray-400 truncate">(Receber - Pagar)</span>
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
                    <div className="flex items-center gap-2 text-xs text-gray-500" data-testid="legend-projections">
                        <span className="flex items-center gap-1" data-testid="legend-projections-income"><div className="w-2 h-2 rounded-full bg-green-500"></div> Receitas</span>
                        <span className="flex items-center gap-1" data-testid="legend-projections-expense"><div className="w-2 h-2 rounded-full bg-red-500"></div> Despesas</span>
                        <span className="flex items-center gap-1" data-testid="legend-projections-cc"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Faturas</span>
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
                            {/* Previous Balance Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-12 hover:bg-gray-50">
                                <TableCell className="font-semibold text-xs sticky left-0 bg-white dark:bg-black z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-blue-600">
                                    Saldo Anterior
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className="text-center text-xs text-blue-600/80 font-medium">
                                        {formatCurrency(m.previousBalance)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-gray-400 bg-gray-50 dark:bg-zinc-900">-</TableCell>
                            </TableRow>

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

                            {/* Result Row */}
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

                            {/* Accumulated Balance Row */}
                            <TableRow className="border-b border-gray-100 dark:border-zinc-800 h-14 bg-gray-50/50 font-medium">
                                <TableCell className="font-bold text-xs sticky left-0 bg-gray-50 dark:bg-zinc-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-blue-700">
                                    SALDO ACUMULADO
                                </TableCell>
                                {projectionData.map(m => (
                                    <TableCell key={m.month} className={`text-center text-xs font-bold ${m.accumulatedBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                        {formatCurrency(m.accumulatedBalance)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-400">-</TableCell>
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