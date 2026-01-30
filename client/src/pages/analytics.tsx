import { formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Category, Transaction, CreditPurchase } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, Filter, Calendar, X, Check, Download, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, DollarSign, Briefcase, Car, Target, Layers, ArrowDownUp, Search, Share2, ArrowRight, ArrowUp, ArrowDown, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, CartesianGrid } from 'recharts';
import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear, addMonths, startOfDay, endOfDay, isAfter, isBefore, subMonths, getYear, setYear } from "date-fns";
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

const COLORS = ['#8b5cf6', '#f97316', '#10b981', '#ef4444', '#3b82f6', '#eab308', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

export default function Analytics() {
  const { transactions, accounts, creditCards, creditPurchases } = useFinancialStore();
  
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
          status: 'pending',
        });

        competencyMonth = addMonths(competencyMonth, 1);
      }
    });

    return virtual;
  }, [creditPurchases, creditCards]);

  // 3. Combined Data (Real + Virtual)
  const combinedTransactions = useMemo(() => {
    // Exclude manual credit card payments to avoid double counting if looking at expense categories
    const realTransactions = transactions.filter(t => !t.description.includes("Pagamento Fatura"));
    return [...realTransactions, ...virtualTransactions];
  }, [transactions, virtualTransactions]);

  // 4. Filtered Data for Overview
  const filteredOverviewData = useMemo(() => {
    return combinedTransactions.filter(t => {
      const txDate = new Date(t.date);
      if (!isWithinInterval(txDate, dateRange)) return false;
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount) return false;
      if (viewMode === 'personal' && !t.isPersonal) return false;
      if (viewMode === 'business' && t.isPersonal) return false;
      return true;
    });
  }, [combinedTransactions, dateRange, selectedType, selectedAccount, viewMode]);

  // --- PROJECTION DATA (Future 12 Months) ---
  const projectionData = useMemo(() => {
      // Use selected year if tab is active, otherwise default to current flow logic
      // But user wants "Projection" which usually implies "Future from now". 
      // If we add Year filter, maybe we just show "That Year's Projection"?
      // Let's stick to "Next 12 months" if no year filter is explicitly asked for "Calendar Year View".
      // But user asked for "filtros de data". A year picker makes sense for "Projection" to see next year vs this year.
      
      const year = parseInt(selectedYear);
      const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
      
      return months.map(monthDate => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthTxs = combinedTransactions.filter(t => {
              const d = new Date(t.date);
              return isWithinInterval(d, { start: monthStart, end: monthEnd }) && 
                     (viewMode === 'personal' ? t.isPersonal : !t.isPersonal);
          });

          const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          
          // Separate Credit Card Expenses vs Other Expenses
          // We treat the projection month as the INVOICE COMPETENCY month.
          // Our virtual installments are dated on the DUE DATE (next month), so
          // to show the correct competency we need to pull CC virtuals from next month.
          const nextMonthStart = startOfMonth(addMonths(monthDate, 1));
          const nextMonthEnd = endOfMonth(addMonths(monthDate, 1));

          const creditCardExpense = combinedTransactions
            .filter(t => t.id.startsWith('virtual-') || t.accountId === 'virtual-card')
            .filter(t => {
              const d = new Date(t.date);
              return isWithinInterval(d, { start: nextMonthStart, end: nextMonthEnd }) &&
                (viewMode === 'personal' ? t.isPersonal : !t.isPersonal);
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const otherExpense = monthTxs
            .filter(t => t.type === 'expense' && !t.id.startsWith('virtual-') && t.accountId !== 'virtual-card')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const totalExpense = creditCardExpense + otherExpense;

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
  }, [combinedTransactions, viewMode, selectedYear]);

  // --- CONSOLIDATION DATA (Past 12 Months - Realized) ---
  const consolidationData = useMemo(() => {
      // Use selected year for history
      const year = parseInt(selectedYear);
      const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)); // Calendar year view if filter selected
      
      // If we want "Last 12 months" regardless of year, we'd use subMonths. 
      // But with a Year Filter, "Consolidation" usually means "Report for Year X".
      // Let's use Calendar Year logic for consistency with the filter.
      
      return months.map(monthDate => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          // STRICTLY PAID TRANSACTIONS
          const monthTxs = transactions.filter(t => { 
              const d = new Date(t.date);
              return isWithinInterval(d, { start: monthStart, end: monthEnd }) && 
                     (viewMode === 'personal' ? t.isPersonal : !t.isPersonal) &&
                     t.status === 'paid';
          });

          const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          
          // Try to separate Credit Card payments if possible (usually identified by category or description)
          // Ideally we look for "Pagamento Fatura" or similar description for CC payments in realized view
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
      }).reverse(); // Show newest first usually, or calendar order? 
      // If it's a "Year Report", usually Jan->Dec. If "History", usually Dec->Jan. 
      // Let's keep reverse (Dec -> Jan) as it's better for mobile scrolling "back in time".
  }, [transactions, viewMode, selectedYear]);


  // --- CHARTS DATA ---
  const incomeExpenseChartData = useMemo(() => {
    // If range > 90 days, group by Month. Else by Day.
    const daysDiff = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24);
    const groupByMonth = daysDiff > 90;

    const grouped = filteredOverviewData.reduce((acc, t) => {
      const date = new Date(t.date);
      const key = groupByMonth ? format(date, 'MM/yyyy') : format(date, 'dd/MM');
      if (!acc[key]) acc[key] = { date: key, income: 0, expense: 0, sortDate: date.getTime() };
      if (t.type === 'income') acc[key].income += t.amount;
      else acc[key].expense += t.amount;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
  }, [filteredOverviewData, dateRange]);

  const categoryChartData = useMemo(() => {
    const grouped = filteredOverviewData.filter(t => t.type === 'expense').reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += t.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOverviewData]);

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
                    {/* Visual breakdown */}
                    <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm" data-testid="card-analytics-breakdown">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider" data-testid="text-analytics-breakdown-title">Período</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white" data-testid="text-analytics-breakdown-subtitle">{periodLabel}</p>
                            </div>
                            <Badge variant="secondary" className="rounded-full" data-testid="badge-analytics-breakdown-scope">Consolidado</Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2">
                            <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-3" data-testid="card-breakdown-income">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                            <ArrowUp className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Entradas</p>
                                            <p className="text-[11px] text-gray-500">Extrato (recebido/pago no período)</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300" data-testid="text-breakdown-income-total">{formatCurrency(totalIncome)}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-3" data-testid="card-breakdown-expense">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                                            <ArrowDown className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Saídas</p>
                                            <p className="text-[11px] text-gray-500">Extrato + parcelas do cartão (impacto mensal)</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-red-700 dark:text-red-300" data-testid="text-breakdown-expense-total">{formatCurrency(totalExpense)}</p>
                                </div>

                                <div className="mt-3 space-y-2" data-testid="list-breakdown-expense-sources">
                                    <div className="flex items-center justify-between text-xs" data-testid="row-breakdown-expense-extrato">
                                        <span className="text-gray-600 dark:text-gray-400">Extrato (despesas)</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(filteredOverviewData.filter(t => t.type === 'expense' && !t.id.startsWith('virtual-') && t.accountId !== 'virtual-card').reduce((s, t) => s + t.amount, 0))}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs" data-testid="row-breakdown-expense-card">
                                        <span className="text-gray-600 dark:text-gray-400">Cartão (parcelas)</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(filteredOverviewData.filter(t => t.type === 'expense' && (t.id.startsWith('virtual-') || t.accountId === 'virtual-card')).reduce((s, t) => s + t.amount, 0))}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 dark:bg-zinc-800" />
                                    <div className="flex items-center justify-between text-xs" data-testid="row-breakdown-expense-note">
                                        <span className="text-gray-500">Pagamento de fatura</span>
                                        <span className="text-gray-500">não entra aqui</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Card className="p-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" data-testid="card-total-income">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Entradas</p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-total-income">{formatCurrency(totalIncome)}</p>
                            <p className="text-[11px] text-blue-700/70 dark:text-blue-300/70 mt-1" data-testid="text-total-income-context">No período: {periodLabel}</p>
                        </Card>
                        <Card className="p-3 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" data-testid="card-total-expense">
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Saídas</p>
                            <p className="text-lg font-bold text-red-700 dark:text-red-300" data-testid="text-total-expense">{formatCurrency(totalExpense)}</p>
                            <p className="text-[11px] text-red-700/70 dark:text-red-300/70 mt-1" data-testid="text-total-expense-context">No período: {periodLabel}</p>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-gray-500" />
                            Fluxo de Caixa
                        </h3>
                        <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeExpenseChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-gray-500" />
                            Gastos por Categoria
                        </h3>
                        <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryChartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {categoryChartData.slice(0, 6).map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
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
                                                <p className="text-[10px] text-gray-500">Saldo Previsto</p>
                                                <p className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                                                        <CreditCard className="w-3 h-3" />
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
                                                <p className="text-[10px] text-gray-500">Resultado</p>
                                                <p className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    R$ {item.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                                        <CreditCard className="w-3 h-3" />
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