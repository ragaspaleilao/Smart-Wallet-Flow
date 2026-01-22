import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Category } from "@/lib/store";
import { generateFinancialInsights, getChartData, getCategoryDistribution, AIInsight } from "@/lib/financial-ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, Filter, Calendar, X, Check } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
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

const COLORS = ['#8b5cf6', '#f97316', '#10b981', '#ef4444', '#3b82f6', '#eab308', '#ec4899'];

export default function Analytics() {
  const { transactions, accounts, investments, budget } = useFinancialStore();
  const [period, setPeriod] = useState<30 | 90>(30);
  
  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        if (selectedCategory && t.category !== selectedCategory) return false;
        if (selectedType && t.type !== selectedType) return false;
        return true;
    });
  }, [transactions, selectedCategory, selectedType]);

  const insights = useMemo(() => generateFinancialInsights(transactions, accounts, investments, budget), [transactions, accounts, investments, budget]);
  const chartData = useMemo(() => getChartData(filteredTransactions, period), [filteredTransactions, period]);
  const categoryData = useMemo(() => getCategoryDistribution(filteredTransactions), [filteredTransactions]);

  const categories = ["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Salário", "Vendas", "Serviços", "Outros"];

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 pb-2 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="-ml-2">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-600" />
                    IA Financeira
                </h1>
                <p className="text-xs text-gray-500">Análise inteligente de dados</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar items-center">
             <Button 
                variant={period === 30 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPeriod(30)}
                className="rounded-full text-xs h-8"
             >
                30 Dias
             </Button>
             <Button 
                variant={period === 90 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPeriod(90)}
                className="rounded-full text-xs h-8"
             >
                3 Meses
             </Button>
             
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant={selectedCategory || selectedType ? "secondary" : "outline"} size="sm" className="rounded-full text-xs h-8 gap-1">
                        <Filter className="w-3 h-3" /> 
                        {selectedCategory || selectedType ? 'Filtrado' : 'Filtros'}
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl">
                    <SheetHeader className="mb-4">
                        <SheetTitle>Filtrar Análise</SheetTitle>
                        <SheetDescription>Refine os dados para a IA analisar.</SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-6 pb-6">
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Tipo de Transação</h4>
                            <div className="flex gap-2">
                                <Button 
                                    variant={selectedType === 'income' ? 'default' : 'outline'} 
                                    size="sm" 
                                    onClick={() => setSelectedType(selectedType === 'income' ? null : 'income')}
                                    className="rounded-full"
                                >
                                    Entradas
                                </Button>
                                <Button 
                                    variant={selectedType === 'expense' ? 'default' : 'outline'} 
                                    size="sm" 
                                    onClick={() => setSelectedType(selectedType === 'expense' ? null : 'expense')}
                                    className="rounded-full"
                                >
                                    Saídas
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Categorias</h4>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <Badge 
                                        key={cat}
                                        variant={selectedCategory === cat ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1 rounded-full"
                                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                    >
                                        {cat}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <SheetFooter>
                        <SheetClose asChild>
                            <Button className="w-full h-12 text-lg">Aplicar Filtros</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
             </Sheet>

             {(selectedCategory || selectedType) && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {setSelectedCategory(null); setSelectedType(null);}}>
                    <X className="w-4 h-4" />
                </Button>
             )}
          </div>
        </div>

        <div className="p-6 space-y-8 pb-24">
            
            {/* AI Insights Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Insights
                    </h2>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">BETA</span>
                </div>
                
                {insights.length === 0 ? (
                    <Card className="p-4 bg-gray-50 dark:bg-zinc-900 border-none shadow-sm">
                        <p className="text-sm text-gray-500 text-center">Tudo parece normal por aqui. Continue assim!</p>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {insights.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                )}
            </div>

            {/* Income vs Expense Chart */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fluxo de Caixa</h2>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Spending Distribution */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Para onde vai seu dinheiro?</h2>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="h-48 w-48 relative flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-gray-400">Categorias</span>
                            </div>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            {categoryData.length > 0 ? categoryData.slice(0, 5).map((cat, idx) => (
                                <div key={cat.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-gray-600 dark:text-gray-300">{cat.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">R$ {cat.value.toFixed(0)}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-400 text-center py-4">Sem dados para este filtro.</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
    const bgColors = {
        alert: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30',
        success: 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30',
        info: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
        prediction: 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30',
    };

    const iconColors = {
        alert: 'text-red-600',
        success: 'text-green-600',
        info: 'text-blue-600',
        prediction: 'text-purple-600',
    };

    const Icons = {
        alert: AlertTriangle,
        success: TrendingUp,
        info: Lightbulb,
        prediction: Brain,
    };

    const Icon = Icons[insight.type];

    return (
        <div className={`p-4 rounded-xl border ${bgColors[insight.type]} flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-500`}>
            <div className={`mt-0.5 ${iconColors[insight.type]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className={`font-semibold text-sm ${iconColors[insight.type]} mb-1`}>{insight.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{insight.message}</p>
            </div>
        </div>
    );
}
