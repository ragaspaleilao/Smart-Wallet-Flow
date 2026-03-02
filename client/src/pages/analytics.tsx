import { formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Category, Transaction, CreditPurchase } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, Filter, Calendar, X, Check, Download, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, DollarSign, Briefcase, Car, Target, Layers, ArrowDownUp, Search, Share2, ArrowRight, ArrowUp, ArrowDown, ChevronDown, ChevronUp, CreditCard as CreditCardIcon, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, CartesianGrid } from 'recharts';
import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear, addMonths, startOfDay, endOfDay, isAfter, isBefore, subMonths, getYear, setYear, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAccounts, useTransactions, useCreditCards, useCreditPurchases, useCreditPayments } from "@/hooks/use-api";

const COLORS = ['#8b5cf6', '#f97316', '#10b981', '#ef4444', '#3b82f6', '#eab308', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

const TAILWIND_COLOR_MAP: Record<string, string> = {
    'bg-black': '#000000',
    'bg-purple-600': '#9333ea',
    'bg-blue-600': '#2563eb',
    'bg-red-600': '#dc2626',
    'bg-green-600': '#16a34a',
    'bg-orange-500': '#f97316',
    'bg-yellow-500': '#eab308',
    'bg-pink-600': '#db2777',
    'bg-indigo-600': '#4f46e5',
    'bg-gray-600': '#4b5563'
};

export default function Analytics() {
  const storeData = useFinancialStore();
  
  // Fetch data from API
  const { data: apiTransactions = [], isLoading: transactionsLoading, isSuccess: transactionsSuccess } = useTransactions();
  const { data: apiAccounts = [], isSuccess: accountsSuccess } = useAccounts();
  const { data: apiCreditCards = [], isSuccess: cardsSuccess } = useCreditCards();
  const { data: apiCreditPurchases = [], isSuccess: purchasesSuccess } = useCreditPurchases();
  const { data: apiCreditPayments = [], isSuccess: paymentsSuccess } = useCreditPayments();
  
  // Use API data when available, fallback to store
  const transactions: Transaction[] = useMemo(() => {
    if (transactionsSuccess) {
      return apiTransactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount),
        date: t.date,
        isPersonal: t.isPersonal,
        status: t.status as 'paid' | 'pending',
        type: t.type as 'income' | 'expense',
      }));
    }
    return storeData.transactions;
  }, [apiTransactions, storeData.transactions, transactionsSuccess]);
  
  const accounts = useMemo(() => {
    if (accountsSuccess) {
      return apiAccounts.map(a => ({
        ...a,
        balance: parseFloat(a.balance),
        initialBalance: parseFloat(a.initialBalance),
      }));
    }
    return storeData.accounts;
  }, [apiAccounts, storeData.accounts, accountsSuccess]);
  
  const creditCards = useMemo(() => {
    if (cardsSuccess) {
      return apiCreditCards.map(c => ({
        ...c,
        creditLimit: parseFloat(c.creditLimit),
        annualFeeValue: c.annualFeeValue ? parseFloat(c.annualFeeValue) : undefined,
      }));
    }
    return storeData.creditCards;
  }, [apiCreditCards, storeData.creditCards, cardsSuccess]);
  
  const creditPurchases: CreditPurchase[] = useMemo(() => {
    if (purchasesSuccess) {
      return apiCreditPurchases.map(p => ({
        id: p.id,
        creditCardId: p.creditCardId,
        description: p.description,
        totalAmount: parseFloat(p.totalAmount),
        purchaseDate: p.purchaseDate,
        installments: p.installments,
        installmentValue: parseFloat(p.installmentValue),
        category: (p.category ?? 'outros') as any,
        status: (p.status === 'active' || p.status === 'partial_refund' || p.status === 'refunded') 
          ? p.status as "active" | "partial_refund" | "refunded"
          : 'active',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }
    return storeData.creditPurchases;
  }, [apiCreditPurchases, storeData.creditPurchases, purchasesSuccess]);
  
  const creditPayments = useMemo(() => {
    if (paymentsSuccess) {
      return apiCreditPayments.map(p => ({
        ...p,
        amount: parseFloat(p.amount),
      }));
    }
    return storeData.creditPayments;
  }, [apiCreditPayments, storeData.creditPayments, paymentsSuccess]);

  const isLoading = transactionsLoading;
  
  // View State
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'year' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'all'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'personal' | 'business'>('personal');
  
  // Expanded States for Projection/Consolidation
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  // Year Filter for Projection/Consolidation
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Details Sheet State
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'income' | 'expense'>('expense');

  // Local filters for Cash Flow
  const [cashFlowView, setCashFlowView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [cashFlowType, setCashFlowType] = useState<'all' | 'income' | 'expense'>('all');

  // Local filters for Categories
  const [categorySource, setCategorySource] = useState<'all' | 'card' | 'other'>('all');
  const [categoryGroupBy, setCategoryGroupBy] = useState<'category' | 'card'>('category');
  const [categoryLimit, setCategoryLimit] = useState<string>('5');

  // Overview Data View Mode (Consolidated/Realized vs Competency/Projected)
  const [overviewViewMode, setOverviewViewMode] = useState<'competency' | 'cash_flow'>('competency');

  const toggleMonth = (monthLabel: string) => {
      setExpandedMonths(prev => 
          prev.includes(monthLabel) ? prev.filter(m => m !== monthLabel) : [...prev, monthLabel]
      );
  };

  // --- DATA PREPARATION ---

  // 1. Helper to determine date range for Overview
  const dateRange = useMemo(() => {
    const today = new Date();

    if (period === 'this_month') {
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }

    if (period === 'last_month') {
      const lastMonth = subMonths(today, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }

    if (period === 'year') return { start: startOfYear(today), end: endOfYear(today) };

    if (period === 'custom' && customStart && customEnd) {
      return { start: parseISO(customStart), end: parseISO(customEnd) };
    }

    return { start: startOfMonth(today), end: endOfMonth(today) };
  }, [period, customStart, customEnd]);

  const periodLabel = useMemo(() => {
    const today = new Date();
    if (period === 'this_month') return `Mês atual (${format(today, 'MM/yyyy')})`;
    if (period === 'last_month') {
      const lastMonth = subMonths(today, 1);
      return `Último mês (${format(lastMonth, 'MM/yyyy')})`;
    }
    if (period === 'year') return `Ano ${format(today, 'yyyy')}`;
    if (period === 'custom' && customStart && customEnd) return `${format(parseISO(customStart), 'dd/MM')} – ${format(parseISO(customEnd), 'dd/MM')}`;
    if (period === 'custom') return 'Personalizado';
    return `Mês atual (${format(today, 'MM/yyyy')})`;
  }, [period, customStart, customEnd]);

  const isInvoiceMonthPaidOrPast = (creditCardId: string, invoiceMonth: Date) => {
    const m = invoiceMonth.getMonth();
    const y = invoiceMonth.getFullYear();
    const hasPaid = (creditPayments || [])
      .filter(p => p.creditCardId === creditCardId)
      .some(p => Number(p.month) === m && Number(p.year) === y);
    if (hasPaid) return true;

    const card = creditCards.find(c => c.id === creditCardId);
    if (!card) return false;
    const invoiceDueBase = addMonths(invoiceMonth, 1);
    const invoiceDueDate = new Date(invoiceDueBase.getFullYear(), invoiceDueBase.getMonth(), card.dueDay);
    return isAfter(startOfDay(new Date()), startOfDay(invoiceDueDate));
  };

  // 2. Generate Virtual Transactions (Installments)
  const virtualTransactions = useMemo(() => {
    const virtual: Transaction[] = [];

    // Invoice competency rule:
    // If purchase day <= closingDay => belongs to previous month (competency).
    // Else belongs to same month. We then spread installments month-by-month.
    const getInvoiceCompetencyMonth = (purchaseDate: Date, closingDay: number) => {
      const d = new Date(purchaseDate);
      if (d.getDate() <= closingDay) return startOfMonth(subMonths(d, 1));
      return startOfMonth(d);
    };

    // 1) Purchases installments (status active)
    creditPurchases
      .filter((p) => p.status === 'active')
      .forEach((purchase) => {
        const card = creditCards.find((c) => c.id === purchase.creditCardId);
        if (!card) return;

        // Normalize YYYY-MM-DD to local midday to avoid timezone shifting.
        const purchaseDate = (() => {
          const raw = String(purchase.purchaseDate || '');
          if (raw.length === 10) return new Date(`${raw}T12:00:00`);
          return new Date(raw);
        })();

        let competencyMonth = getInvoiceCompetencyMonth(purchaseDate, card.closingDay);

        for (let i = 1; i <= purchase.installments; i++) {
          // Due date = month after competency
          const dueBase = addMonths(competencyMonth, 1);
          const dueDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), card.dueDay);

          virtual.push({
            id: `virtual-${purchase.id}-${i}`,
            amount: purchase.installmentValue,
            type: 'expense',
            category: purchase.category,
            description: `${purchase.description} (${i}/${purchase.installments})`,
            date: dueDate.toISOString(),
            source: 'manual',
            isPersonal: true,
            accountId: card.linkedAccountId || 'virtual-card',
            creditCardId: card.id,
            status: 'pending',
          });

          competencyMonth = addMonths(competencyMonth, 1);
        }
      });

    // 2) Annual fee (monthly) — must be included in Analytics projection as well
    // Only add to invoices that are NOT already paid
    creditCards.forEach((card) => {
      if (!card.hasAnnualFee || !card.annualFeeValue || card.annualFeeValue <= 0) return;

      for (let m = 0; m < 12; m++) {
        const competencyMonth = new Date(parseInt(selectedYear), m, 1);

        if (isInvoiceMonthPaidOrPast(card.id, competencyMonth)) continue;

        const dueBase = addMonths(competencyMonth, 1);
        const dueDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), card.dueDay);

        virtual.push({
          id: `virtual-fee-${card.id}-${selectedYear}-${m}`,
          amount: card.annualFeeValue,
          type: 'expense',
          category: 'Outros',
          description: `Anuidade (${card.name})`,
          date: dueDate.toISOString(),
          source: 'manual',
          isPersonal: true,
          accountId: card.linkedAccountId || 'virtual-card',
          creditCardId: card.id,
          status: 'pending',
        });
      }
    });

    return virtual;
  }, [creditPurchases, creditCards, selectedYear, creditPayments]);

  // 3. Combined Data (Real + Virtual)
  const combinedTransactions = useMemo(() => {
    // Exclude the payment transaction itself; invoice status is decided by creditPayments.
    const realTransactions = transactions.filter(t => !t.description.includes("Pagamento Fatura"));
    return [...realTransactions, ...virtualTransactions];
  }, [transactions, virtualTransactions]);

  // 4. Filtered Data for Overview
  const filteredOverviewData = useMemo(() => {
    // Select base data source based on view mode
    // 'competency' = Combined (Real - InvoicePayment + Virtual) -> Standard behavior
    // 'cash_flow' = Real Transactions Only (including InvoicePayment, ignoring Virtual) -> For "Realized" view
    const sourceData = overviewViewMode === 'cash_flow' ? transactions : combinedTransactions;

    return sourceData.filter(t => {
      const txDate = new Date(t.date);
      if (!isWithinInterval(txDate, dateRange)) return false;
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount) return false;
      if (viewMode === 'personal' && !t.isPersonal) return false;
      if (viewMode === 'business' && t.isPersonal) return false;
      
      // In Cash Flow (Realized) mode, strictly filter by PAID status
      if (overviewViewMode === 'cash_flow' && t.status !== 'paid') return false;

      // In Open/Pending (Competency) mode, strictly filter by PENDING status
      if (overviewViewMode === 'competency' && t.status === 'paid') return false;

      return true;
    });
  }, [combinedTransactions, transactions, dateRange, selectedType, selectedAccount, viewMode, overviewViewMode]);


  const handleOpenDetails = (type: 'income' | 'expense') => {
    setDetailsType(type);
    setDetailsSheetOpen(true);
  };

  const detailsTransactions = useMemo(() => {
    return filteredOverviewData
      .filter(t => t.type === detailsType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOverviewData, detailsType]);
  const yearStartingBalance = useMemo(() => {
    const year = parseInt(selectedYear);
    if (!accounts?.length) return 0;

    // For planning, we start from current balances as the baseline for the year.
    // (Mockup limitation: without backend/history of balances, this is the best available signal.)
    const scopeAccounts = accounts.filter((a) => (viewMode === 'personal' ? a.isPersonal : !a.isPersonal));
    return scopeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [accounts, selectedYear, viewMode]);

  const projectionData = useMemo(() => {
      const year = parseInt(selectedYear);
      const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
      const today = startOfDay(new Date());

      // IMPORTANT: Projection must match Spreadsheet projection exactly.
      // 1) Normal transactions: pending.
      //    - If date < today (overdue), add to the first month (Current Month).
      //    - If date >= today, add to the respective month.
      // 2) Credit card bills: ...

      const invoiceMonthStart = startOfMonth(subMonths(today, 1));

      const paidPerMonth = months.map(() => ({ income: 0, expense: 0 }));

      combinedTransactions.forEach(t => {
          const d = new Date(t.date);
          const matchContext = (viewMode === 'personal' ? t.isPersonal : !t.isPersonal);
          if (!matchContext || t.status !== 'paid') return;
          if (d.getFullYear() !== year) return;
          if (String(t.id || '').startsWith('virtual-') || t.accountId === 'virtual-card') return;
          const m = d.getMonth();
          if (t.type === 'income') paidPerMonth[m].income += t.amount;
          else paidPerMonth[m].expense += t.amount;
      });

      const monthsWithTotals = months.map((monthDate, index) => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const isFirstMonth = index === 0;

          const monthTxs = combinedTransactions.filter(t => {
              const d = new Date(t.date);
              
              const matchContext = (viewMode === 'personal' ? t.isPersonal : !t.isPersonal);
              const isPending = t.status === 'pending';
              if (!matchContext || !isPending) return false;

              if (isFirstMonth) {
                  const isInMonth = isWithinInterval(d, { start: monthStart, end: monthEnd });
                  const isOverdue = d < monthStart; 
                  return isInMonth || isOverdue;
              } else {
                  return isWithinInterval(d, { start: monthStart, end: monthEnd });
              }
          });

          const monthTxsNonCard = monthTxs.filter(t => !String(t.id || '').startsWith('virtual-') && t.accountId !== 'virtual-card');

          const income = monthTxsNonCard.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const expense = monthTxsNonCard.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

          const competenceMonth = startOfMonth(monthDate);
          const isCurrentOrFutureCompetence = !isBefore(competenceMonth, invoiceMonthStart);

          let creditCardExpense = 0;
          if (isCurrentOrFutureCompetence) {
            creditPurchases
              .filter(p => p.status === 'active')
              .forEach(purchase => {
                const card = creditCards.find(c => c.id === purchase.creditCardId);
                if (!card) return;

                if (isInvoiceMonthPaidOrPast(card.id, competenceMonth)) return;

                const pDate = (() => {
                  const raw = String(purchase.purchaseDate || '');
                  if (raw.length === 10) return new Date(`${raw}T12:00:00`);
                  return new Date(raw);
                })();

                const getInvoiceDate = (date: Date) => {
                  const d = new Date(date);
                  if (d.getDate() <= card.closingDay) return subMonths(d, 1);
                  return d;
                };

                let currentInvoiceDate = startOfMonth(getInvoiceDate(pDate));

                for (let i = 1; i <= purchase.installments; i++) {
                  const isInSelectedYear = currentInvoiceDate.getFullYear() === year;
                  if (isInSelectedYear && isSameMonth(currentInvoiceDate, competenceMonth)) {
                    creditCardExpense += purchase.installmentValue;
                  }
                  currentInvoiceDate = startOfMonth(addMonths(currentInvoiceDate, 1));
                }
              });

            // Annual fee (monthly) follows same rule as Spreadsheet (only from invoiceMonthStart onward)
            creditCards.forEach(card => {
              if (!card.hasAnnualFee || !card.annualFeeValue || card.annualFeeValue <= 0) return;
              if (isInvoiceMonthPaidOrPast(card.id, competenceMonth)) return;
              creditCardExpense += card.annualFeeValue;
            });
          }

          return {
              date: monthDate,
              monthLabel: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
              income,
              expense: expense + creditCardExpense,
              creditCardExpense,
              otherExpense: expense,
              balance: income - (expense + creditCardExpense)
          };
      });

      let running = yearStartingBalance;
      return monthsWithTotals.map((m, idx) => {
        const previousBalance = running;
        const paidResult = paidPerMonth[idx].income - paidPerMonth[idx].expense;
        running = running + paidResult + m.balance;
        return {
          ...m,
          previousBalance,
          endingBalance: running,
        };
      });
  }, [combinedTransactions, viewMode, selectedYear, yearStartingBalance, creditCards, creditPurchases, creditPayments]);

  // --- CONSOLIDATION DATA (Past 12 Months - Realized) ---
  const consolidationData = useMemo(() => {
      // Use selected year for history
      const year = parseInt(selectedYear);
      const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)); // Calendar year view if filter selected
      
      // If we want "Last 12 months" regardless of year, we'd use subMonths. 
      // But with a Year Filter, "Consolidation" usually means "Report for Year X".
      // Let's use Calendar Year logic for consistency with the filter.
      
      const monthsWithTotals = months.map(monthDate => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthTxs = transactions.filter(t => { 
              const d = new Date(t.date);
              return isWithinInterval(d, { start: monthStart, end: monthEnd }) && 
                     (viewMode === 'personal' ? t.isPersonal : !t.isPersonal) &&
                     t.status === 'paid';
          });

          const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          
          const creditCardExpense = monthTxs
             .filter(t => t.description.toLowerCase().includes('fatura') || (t.category as string) === 'Cartão de Crédito')
             .reduce((sum, t) => sum + t.amount, 0);

          const otherExpense = monthTxs
             .filter(t => t.type === 'expense' && !t.description.toLowerCase().includes('fatura') && (t.category as string) !== 'Cartão de Crédito')
             .reduce((sum, t) => sum + t.amount, 0);

          return {
              date: monthDate,
              monthLabel: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
              income,
              expense: creditCardExpense + otherExpense,
              creditCardExpense,
              otherExpense,
              balance: income - (creditCardExpense + otherExpense)
          };
      });

      // User requested Jan->Dec order (Chronological)
      const ordered = monthsWithTotals;
      
      // Calculate running balances
      // Note: In a real app, we would calculate the actual starting balance of the year based on history.
      // Here we use the estimated yearStartingBalance.
      let running = yearStartingBalance;
      
      return ordered.map((m) => {
        const previousBalance = running;
        running = running + m.balance;
        return {
          ...m,
          previousBalance,
          endingBalance: running,
        };
      });
  }, [transactions, viewMode, selectedYear, yearStartingBalance]);


  // --- CHARTS DATA ---
  const incomeExpenseChartData = useMemo(() => {
    let relevantTxs = filteredOverviewData;
    if (cashFlowType === 'income') relevantTxs = relevantTxs.filter(t => t.type === 'income');
    if (cashFlowType === 'expense') relevantTxs = relevantTxs.filter(t => t.type === 'expense');

    const grouped = relevantTxs.reduce((acc, t) => {
      const d = new Date(t.date);
      let key = '';
      let sortDate = 0;
      let label = '';

      if (cashFlowView === 'daily') {
        key = format(d, 'yyyy-MM-dd');
        sortDate = d.getTime();
        label = format(d, 'dd/MM');
      } else if (cashFlowView === 'weekly') {
        const weekStart = startOfWeek(d, { locale: ptBR });
        key = format(weekStart, 'yyyy-ww');
        sortDate = weekStart.getTime();
        label = `Sem ${format(d, 'w')}`;
      } else { // monthly
        key = format(d, 'yyyy-MM');
        sortDate = startOfMonth(d).getTime();
        label = format(d, 'MMM');
      }

      if (!acc[key]) acc[key] = { date: label, income: 0, expense: 0, sortDate };

      if (t.type === 'income') acc[key].income += t.amount;
      else acc[key].expense += t.amount;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
  }, [filteredOverviewData, cashFlowView, cashFlowType]);

  const categoryChartData = useMemo(() => {
    let sourceTxs = filteredOverviewData.filter(t => t.type === 'expense');

    if (categorySource === 'card') {
       sourceTxs = sourceTxs.filter(t => String(t.id || '').startsWith('virtual-') || t.accountId === 'virtual-card');
    } else if (categorySource === 'other') {
       sourceTxs = sourceTxs.filter(t => !String(t.id || '').startsWith('virtual-') && t.accountId !== 'virtual-card');
    }

    const grouped = sourceTxs.reduce((acc, t) => {
      let key = t.category;
      let color: string | undefined = undefined;

      if (categorySource === 'card' && categoryGroupBy === 'card') {
          // Group by Card
          const card = creditCards.find(c => c.id === t.creditCardId);
          if (card) {
              key = card.name;
              // Map Tailwind class to Hex for Recharts
              color = TAILWIND_COLOR_MAP[card.color] || card.color;
          } else {
              key = 'Outros Cartões';
          }
      }

      if (!acc[key]) {
          acc[key] = { value: 0, color };
      }
      
      // Ensure color is updated if found (e.g. if previous tx didn't have it but this one does)
      if (color) {
          acc[key].color = color;
      }

      acc[key].value += t.amount;
      return acc;
    }, {} as Record<string, { value: number, color?: string }>);
    
    const sorted = Object.entries(grouped)
        .map(([name, data]) => ({ name, value: data.value, color: data.color }))
        .sort((a, b) => b.value - a.value);

    if (categoryLimit === 'all') return sorted;
    return sorted.slice(0, parseInt(categoryLimit));
  }, [filteredOverviewData, categorySource, categoryLimit, categoryGroupBy, creditCards]);

  // Overview Totals
  const totalIncome = filteredOverviewData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredOverviewData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;


  const handleExport = (format: string) => {
    toast({ title: "Exportando Relatório", description: `Gerando arquivo ${format}...` });
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-black pb-24">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 sticky top-0 z-20 border-b border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold">Análise & Relatórios</h1>
                </div>
                
                <div className="flex gap-2">
                    {activeTab !== 'overview' && (
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <Sheet>
                        <SheetTrigger asChild>
                             <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full border-dashed border-gray-300">
                                <Filter className="w-3.5 h-3.5" />
                                {activeTab === 'overview' ? 'Filtros' : 'Opções'}
                             </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full">
                            <SheetHeader>
                                <SheetTitle>Filtros Avançados</SheetTitle>
                            </SheetHeader>
                            <div className="py-6 space-y-6">
                                {/* Filters Content (Simplified for brevity) */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-3">
                                        <Label>Período (Visão Geral)</Label>
                                        <div className="space-y-2" data-testid="filter-period">
                                            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                                                <SelectTrigger data-testid="select-period"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="this_month">Mês atual</SelectItem>
                                                    <SelectItem value="last_month">Último mês</SelectItem>
                                                    <SelectItem value="year">Ano</SelectItem>
                                                    <SelectItem value="custom">Personalizado</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {period === 'custom' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Início</Label>
                                                        <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} data-testid="input-custom-start" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Fim</Label>
                                                        <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} data-testid="input-custom-end" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-3">
                                    <Label>Conta</Label>
                                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                        <SelectTrigger data-testid="select-account"><SelectValue placeholder="Todas" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as contas</SelectItem>
                                            {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <SheetFooter>
                                <SheetClose asChild><Button className="w-full" data-testid="button-apply-filters">Aplicar</Button></SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleExport("PDF")}>
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white dark:bg-zinc-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}
                >
                    Visão Geral
                </button>
                <button 
                    onClick={() => setActiveTab('projection')}
                    className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'projection' ? 'bg-white dark:bg-zinc-700 shadow text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}
                >
                    Projeção
                </button>
                <button 
                    onClick={() => setActiveTab('consolidation')}
                    className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'consolidation' ? 'bg-white dark:bg-zinc-700 shadow text-green-600 dark:text-green-400' : 'text-gray-500'}`}
                >
                    Consolidação
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-6">
            
            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* View Mode Switcher */}
                    <div className="flex justify-end">
                        <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg inline-flex">
                            <button
                                onClick={() => setOverviewViewMode('competency')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${overviewViewMode === 'competency' ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Em Aberto
                            </button>
                            <button
                                onClick={() => setOverviewViewMode('cash_flow')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${overviewViewMode === 'cash_flow' ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Caixa (Só Pago)
                            </button>
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3">
                        <Card 
                            className="p-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors" 
                            data-testid="card-total-income"
                            onClick={() => handleOpenDetails('income')}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Entradas</p>
                                <Search className="w-3 h-3 text-blue-400" />
                            </div>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-total-income">{formatCurrency(totalIncome)}</p>
                            <p className="text-[11px] text-blue-700/70 dark:text-blue-300/70 mt-1" data-testid="text-total-income-context">No período: {periodLabel}</p>
                        </Card>
                        <Card 
                            className="p-3 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors" 
                            data-testid="card-total-expense"
                            onClick={() => handleOpenDetails('expense')}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Saídas</p>
                                <Search className="w-3 h-3 text-red-400" />
                            </div>
                            <p className="text-lg font-bold text-red-700 dark:text-red-300" data-testid="text-total-expense">{formatCurrency(totalExpense)}</p>
                            <p className="text-[11px] text-red-700/70 dark:text-red-300/70 mt-1" data-testid="text-total-expense-context">No período: {periodLabel}</p>
                        </Card>
                    </div>

                    <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
                        <SheetContent side="bottom" className="h-[80vh]">
                            <SheetHeader className="mb-4">
                                <SheetTitle>Detalhamento de {detailsType === 'income' ? 'Entradas' : 'Saídas'}</SheetTitle>
                                <SheetDescription>
                                    Listagem completa dos lançamentos que compõem o total de {formatCurrency(detailsType === 'income' ? totalIncome : totalExpense)}.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="overflow-y-auto h-full pb-12 space-y-2">
                                {detailsTransactions.map((t, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span>{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                                                <span>•</span>
                                                <span className="capitalize">{t.category}</span>
                                                {String(t.id).startsWith('virtual-') && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 ml-1">Virtual</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(t.amount)}
                                            </p>
                                            <Badge 
                                                variant={t.status === 'paid' ? 'default' : 'secondary'} 
                                                className={`text-[10px] h-5 px-1.5 mt-1 ${t.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'}`}
                                            >
                                                {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-gray-500" />
                                Fluxo de Caixa
                            </h3>
                            <div className="flex gap-2">
                                <Select value={cashFlowType} onValueChange={(v: any) => setCashFlowType(v)}>
                                    <SelectTrigger className="h-7 text-[10px] w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tudo</SelectItem>
                                        <SelectItem value="income">Entradas</SelectItem>
                                        <SelectItem value="expense">Saídas</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={cashFlowView} onValueChange={(v: any) => setCashFlowView(v)}>
                                    <SelectTrigger className="h-7 text-[10px] w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Diário</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="monthly">Mensal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeExpenseChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { notation: 'compact' })}`}
                                        width={45}
                                    />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                                    <Bar 
                                        dataKey="income" 
                                        name="Entradas" 
                                        fill="#10b981" 
                                        radius={[4, 4, 0, 0]} 
                                        hide={cashFlowType === 'expense'}
                                        label={{ 
                                            position: 'top', 
                                            fontSize: 10, 
                                            fill: '#10b981',
                                            formatter: (val: number) => val > 0 ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''
                                        }}
                                    />
                                    <Bar 
                                        dataKey="expense" 
                                        name="Saídas" 
                                        fill="#ef4444" 
                                        radius={[4, 4, 0, 0]} 
                                        hide={cashFlowType === 'income'}
                                        label={{ 
                                            position: 'top', 
                                            fontSize: 10, 
                                            fill: '#ef4444',
                                            formatter: (val: number) => val > 0 ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-gray-500" />
                                Gastos por Categoria
                            </h3>
                            <div className="flex gap-2">
                                <Select value={categorySource} onValueChange={(v: any) => {
                                    setCategorySource(v);
                                    if (v !== 'card') setCategoryGroupBy('category');
                                }}>
                                    <SelectTrigger className="h-7 text-[10px] w-[90px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tudo</SelectItem>
                                        <SelectItem value="card">Cartão</SelectItem>
                                        <SelectItem value="other">Outros</SelectItem>
                                    </SelectContent>
                                </Select>

                                {categorySource === 'card' && (
                                    <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg h-7">
                                        <button 
                                            onClick={() => setCategoryGroupBy('category')}
                                            className={`px-2 text-[10px] font-medium rounded-md transition-all ${categoryGroupBy === 'category' ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Categoria
                                        </button>
                                        <button 
                                            onClick={() => setCategoryGroupBy('card')}
                                            className={`px-2 text-[10px] font-medium rounded-md transition-all ${categoryGroupBy === 'card' ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Cartão
                                        </button>
                                    </div>
                                )}
                                <Select value={categoryLimit} onValueChange={(v: any) => setCategoryLimit(v)}>
                                    <SelectTrigger className="h-7 text-[10px] w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">Top 5</SelectItem>
                                        <SelectItem value="10">Top 10</SelectItem>
                                        <SelectItem value="all">Todos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {categoryChartData.slice(0, 6).map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color || COLORS[idx % COLORS.length] }} />
                                        <span className="text-gray-600 dark:text-gray-400 truncate">{cat.name}</span>
                                        <span className="font-bold ml-auto">{totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* --- PROJECTION TAB --- */}
            {activeTab === 'projection' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30" data-testid="card-projection-explainer">
                        <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-purple-900 dark:text-purple-300">Projeção (planejamento)</h3>
                        </div>
                        <p className="text-xs text-purple-800 dark:text-purple-400" data-testid="text-projection-explainer">
                            Aqui entram <span className="font-semibold">lançamentos previstos/pendentes</span> (ex.: parcelas futuras do cartão e compromissos recorrentes). Use para enxergar o impacto mês a mês.
                        </p>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-wider">Ano de {selectedYear}</h3>
                    
                    <div className="space-y-3">
                        {projectionData.map((item, idx) => (
                            <Collapsible key={idx} open={expandedMonths.includes(item.monthLabel)} onOpenChange={() => toggleMonth(item.monthLabel)}>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                        <div className="p-4 flex items-center justify-between cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                                    {item.monthLabel}
                                                    {expandedMonths.includes(item.monthLabel) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                </p>
                                                <div className="flex gap-3 text-xs mt-1">
                                                    <span className="text-green-600 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> {formatCurrency(item.income)}</span>
                                                    <span className="text-red-600 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> {formatCurrency(item.expense)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500" data-testid={`text-projection-prev-balance-label-${idx}`}>Saldo anterior</p>
                                                <p className={`font-bold ${item.previousBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-projection-prev-balance-${idx}`}>
                                                    {formatCurrency(item.previousBalance)}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-2" data-testid={`text-projection-ending-balance-label-${idx}`}>Saldo previsto</p>
                                                <p className={`font-bold ${item.endingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-projection-ending-balance-${idx}`}>
                                                    {formatCurrency(item.endingBalance)}
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                                            {/* Details Breakdown */}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded text-green-600">
                                                        <DollarSign className="w-3 h-3" />
                                                    </div>
                                                    Receitas
                                                </span>
                                                <span className="font-medium text-green-600">+ {formatCurrency(item.income)}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600">
                                                        <CreditCardIcon className="w-3 h-3" />
                                                    </div>
                                                    Fatura Cartão
                                                </span>
                                                <span className="font-medium text-red-600">- {formatCurrency(item.creditCardExpense)}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded text-red-600">
                                                        <TrendingUp className="w-3 h-3" />
                                                    </div>
                                                    Outras Despesas
                                                </span>
                                                <span className="font-medium text-red-600">- {formatCurrency(item.otherExpense)}</span>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-zinc-700 pt-2 flex justify-between items-center text-sm font-bold">
                                                <span>Resultado</span>
                                                <span className={item.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(item.balance)}
                                                </span>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        ))}
                    </div>
                </div>
            )}

            {/* --- CONSOLIDATION TAB --- */}
            {activeTab === 'consolidation' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/30" data-testid="card-consolidation-explainer">
                        <div className="flex items-center gap-3 mb-2">
                            <Check className="w-5 h-5 text-green-600" />
                            <h3 className="font-bold text-green-900 dark:text-green-300">Consolidação (realizado)</h3>
                        </div>
                        <p className="text-xs text-green-800 dark:text-green-400" data-testid="text-consolidation-explainer">
                            Aqui contam <span className="font-semibold">somente</span> lançamentos marcados como <span className="font-semibold">pagos/recebidos</span> no Extrato. Serve para fechar o mês e comparar com o planejado.
                        </p>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-wider">Ano de {selectedYear}</h3>

                    <div className="space-y-3">
                        {consolidationData.map((item, idx) => (
                            <Collapsible key={idx} open={expandedMonths.includes(item.monthLabel)} onOpenChange={() => toggleMonth(item.monthLabel)}>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <CollapsibleTrigger asChild>
                                        <div className="p-4 flex items-center justify-between cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                                                    {item.monthLabel}
                                                    {expandedMonths.includes(item.monthLabel) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                </p>
                                                <div className="flex gap-3 text-xs mt-1">
                                                    <span className="text-green-600 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> {item.income.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                                                    <span className="text-red-600 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> {item.expense.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500" data-testid={`text-consolidation-prev-balance-label-${idx}`}>Saldo anterior</p>
                                                <p className={`font-bold ${item.previousBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-consolidation-prev-balance-${idx}`}>
                                                    {formatCurrency(item.previousBalance)}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-2" data-testid={`text-consolidation-result-label-${idx}`}>Resultado</p>
                                                <p className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-consolidation-result-${idx}`}>
                                                    {formatCurrency(item.balance)}
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                                            {/* Details Breakdown */}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded text-green-600">
                                                        <DollarSign className="w-3 h-3" />
                                                    </div>
                                                    Receitas
                                                </span>
                                                <span className="font-medium text-green-600">+ {formatCurrency(item.income)}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600">
                                                        <CreditCardIcon className="w-3 h-3" />
                                                    </div>
                                                    Fatura Cartão
                                                </span>
                                                <span className="font-medium text-red-600">- {formatCurrency(item.creditCardExpense)}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded text-red-600">
                                                        <TrendingUp className="w-3 h-3" />
                                                    </div>
                                                    Outras Despesas
                                                </span>
                                                <span className="font-medium text-red-600">- {formatCurrency(item.otherExpense)}</span>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-zinc-700 pt-2 flex justify-between items-center text-sm font-bold">
                                                <span>Resultado</span>
                                                <span className={item.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(item.balance)}
                                                </span>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </MobileLayout>
  );
}