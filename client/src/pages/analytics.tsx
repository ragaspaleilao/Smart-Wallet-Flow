import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Category, Transaction } from "@/lib/store";
import { generateFinancialInsights, getChartData, getCategoryDistribution, AIInsight } from "@/lib/financial-ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, Filter, Calendar, X, Check, Download, PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon, DollarSign, Briefcase, Car, Target, Layers, ArrowDownUp, Search, Share2 } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, CartesianGrid } from 'recharts';
import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from "date-fns";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const COLORS = ['#8b5cf6', '#f97316', '#10b981', '#ef4444', '#3b82f6', '#eab308', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

export default function Analytics() {
  const { transactions, accounts, investments, budget, goals, vehicles } = useFinancialStore();
  
  // State for Filters
  const [period, setPeriod] = useState<'30' | '90' | 'year' | 'custom'>('30');
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'all'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'personal' | 'business'>('personal');
  const [showPremium, setShowPremium] = useState(false);

  // Helper to determine date range
  const dateRange = useMemo(() => {
    const today = new Date();
    if (period === '30') return { start: subDays(today, 30), end: today };
    if (period === '90') return { start: subDays(today, 90), end: today };
    if (period === 'year') return { start: startOfYear(today), end: endOfYear(today) };
    if (period === 'custom' && customStart && customEnd) {
      return { start: parseISO(customStart), end: parseISO(customEnd) };
    }
    return { start: subDays(today, 30), end: today };
  }, [period, customStart, customEnd]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Date Filter
      const txDate = new Date(t.date);
      if (!isWithinInterval(txDate, dateRange)) return false;

      // 2. Type Filter
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // 3. Account Filter
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount) return false;

      // 4. Category Filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // 5. Personal vs Business
      if (viewMode === 'personal' && !t.isPersonal) return false;
      if (viewMode === 'business' && t.isPersonal) return false;

      return true;
    });
  }, [transactions, dateRange, selectedType, selectedAccount, selectedCategory, viewMode]);

  // Derived Data for Charts
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // 1. Income vs Expense Over Time (Bar Chart)
  const incomeExpenseData = useMemo(() => {
    const data: any[] = [];
    // Group by month/day depending on range (simplified to daily for now)
    const grouped = filteredTransactions.reduce((acc, t) => {
      const day = format(new Date(t.date), 'dd/MM');
      if (!acc[day]) acc[day] = { date: day, income: 0, expense: 0 };
      if (t.type === 'income') acc[day].income += t.amount;
      else acc[day].expense += t.amount;
      return acc;
    }, {} as Record<string, any>);
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)); // Simple sort
  }, [filteredTransactions]);

  // 2. Category Distribution (Pie Chart)
  const categoryData = useMemo(() => {
    const grouped = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += t.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // 3. Balance Evolution (Line Chart) - Simulated based on filtered transactions
  const balanceEvolutionData = useMemo(() => {
    let runningBalance = accounts.filter(a => viewMode === 'personal' ? a.isPersonal : !a.isPersonal).reduce((acc, a) => acc + a.initialBalance, 0); // Simplified start
    // Sort transactions by date asc
    const sortedTx = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sortedTx.map(t => {
      if (t.type === 'income') runningBalance += t.amount;
      else runningBalance -= t.amount;
      return {
        date: format(new Date(t.date), 'dd/MM'),
        balance: runningBalance
      };
    });
  }, [filteredTransactions, accounts, viewMode]);

  // 4. Accounts Distribution (Stacked)
  const accountsData = useMemo(() => {
    return accounts.filter(a => viewMode === 'personal' ? a.isPersonal : !a.isPersonal).map(a => ({
      name: a.name,
      value: a.balance,
      color: a.color
    }));
  }, [accounts, viewMode]);

  // Export Function
  const handleExport = (format: string) => {
    toast({
      title: "Exportando Relatório",
      description: `Gerando arquivo ${format}... O download iniciará em instantes.`,
    });
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
                    <h1 className="text-lg font-bold">Análise Avançada</h1>
                </div>
                <div className="flex gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                             <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full border-dashed border-gray-300">
                                <Filter className="w-3.5 h-3.5" />
                                Filtros
                             </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full">
                            <SheetHeader>
                                <SheetTitle>Filtros Avançados</SheetTitle>
                                <SheetDescription>Refine a análise dos seus dados.</SheetDescription>
                            </SheetHeader>
                            <div className="py-6 space-y-6">
                                <div className="space-y-3">
                                    <Label>Visão</Label>
                                    <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                                        <button 
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'personal' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-gray-500'}`}
                                            onClick={() => setViewMode('personal')}
                                        >
                                            Pessoal
                                        </button>
                                        <button 
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'business' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-gray-500'}`}
                                            onClick={() => setViewMode('business')}
                                        >
                                            Negócio
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>Período</Label>
                                    <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                                            <SelectItem value="90">Últimos 3 meses</SelectItem>
                                            <SelectItem value="year">Este Ano</SelectItem>
                                            <SelectItem value="custom">Personalizado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {period === 'custom' && (
                                        <div className="flex gap-2">
                                            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                                            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label>Conta</Label>
                                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todas as contas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as contas</SelectItem>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label>Categoria</Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todas as categorias" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as categorias</SelectItem>
                                            {['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros'].map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <SheetFooter>
                                <SheetClose asChild>
                                    <Button className="w-full">Aplicar Filtros</Button>
                                </SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleExport("PDF")}>
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                <Card className="p-3 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Entradas</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-3 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Saídas</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </Card>
            </div>
            <div className="grid grid-cols-2 gap-3">
                 <Card className={`p-3 border-none shadow-sm ${balance >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Resultado</p>
                    <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </Card>
                <Card className="p-3 bg-white dark:bg-zinc-800 border-gray-100 dark:border-zinc-700">
                    <p className="text-xs text-gray-500 font-medium mb-1">Economia</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{savingsRate.toFixed(1)}%</p>
                </Card>
            </div>
        </div>

        <div className="p-4 space-y-6">
            
            {/* 1. Receitas vs Despesas */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        Receitas vs Despesas
                    </h3>
                </div>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeExpenseData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* 2. Distribuição de Despesas */}
            <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-gray-500" />
                    Para onde vai o dinheiro?
                </h3>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {categoryData.slice(0, 6).map((cat, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-gray-600 dark:text-gray-400 truncate">{cat.name}</span>
                                <span className="font-bold ml-auto">{((cat.value / totalExpense) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* 3. Evolução do Saldo (Premium Teaser) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                     <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <LineChartIcon className="w-5 h-5 text-gray-500" />
                        Evolução Patrimonial
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200">Premium</Badge>
                </div>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-none shadow-sm h-56 relative overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={balanceEvolutionData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="balance" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorBalance)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    
                    {/* Premium Lock Overlay - Simulated for effect if user wasn't premium (but here shown unlocked for demo) */}
                    {/* 
                    <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col gap-2">
                        <Lock className="w-8 h-8 text-gray-400" />
                        <p className="text-sm font-bold text-gray-600">Disponível no Premium</p>
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">Desbloquear</Button>
                    </div> 
                    */}
                </Card>
            </div>

            {/* 4. Contas e Distribuição */}
            <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    Distribuição por Conta
                </h3>
                <div className="grid gap-3">
                    {accountsData.map((acc, idx) => (
                        <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-xl flex items-center justify-between border-l-4" style={{ borderLeftColor: acc.color.replace('bg-', '').replace('-600', '') }}>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{acc.name}</span>
                            <div className="text-right">
                                <p className="font-bold text-gray-900 dark:text-white">R$ {acc.value.toLocaleString('pt-BR')}</p>
                                <p className="text-[10px] text-gray-500">{((acc.value / accountsData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}% do total</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Export Actions */}
            <div className="pt-4 pb-8">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Exportar Relatórios</h3>
                <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 bg-white dark:bg-zinc-900" onClick={() => handleExport("PDF")}>
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <Download className="w-4 h-4" />
                        </div>
                        <span className="text-xs">PDF</span>
                    </Button>
                    <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 bg-white dark:bg-zinc-900" onClick={() => handleExport("Excel")}>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Download className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Excel</span>
                    </Button>
                    <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 bg-white dark:bg-zinc-900" onClick={() => handleExport("CSV")}>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Download className="w-4 h-4" />
                        </div>
                        <span className="text-xs">CSV</span>
                    </Button>
                </div>
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}
