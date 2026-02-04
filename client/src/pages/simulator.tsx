import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Category } from "@/lib/store";
import { ArrowLeft, Calculator, Calendar, CreditCard, DollarSign, Plus, Save, Trash2, CheckCircle2, AlertTriangle, TrendingDown, Pencil, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useSimulations, useCreateSimulation, useUpdateSimulation, useDeleteSimulation, useTransactions, useAccounts } from "@/hooks/use-api";

interface Simulation {
  id: string;
  name: string;
  totalValue: number;
  downPayment: number;
  installments: number;
  startDate: string;
  category: Category;
  type: string;
  createdAt: string;
  interestRate?: number;
  manualInstallmentValue?: number;
}

export default function Simulator() {
  const [location, setLocation] = useLocation();
  const { data: transactionsData = [] } = useTransactions();
  const { data: accountsData = [] } = useAccounts();
  const { data: simulationsData = [], isLoading } = useSimulations();
  const createSimulationMutation = useCreateSimulation();
  const updateSimulationMutation = useUpdateSimulation();
  const deleteSimulationMutation = useDeleteSimulation();
  
  const transactions = transactionsData;
  const accounts = accountsData;
  const simulations: Simulation[] = (simulationsData || []).map((s: any) => ({
    ...s,
    totalValue: Number(s.totalValue),
    downPayment: Number(s.downPayment),
    installments: Number(s.installments),
    interestRate: s.interestRate ? Number(s.interestRate) : undefined,
    manualInstallmentValue: s.manualInstallmentValue ? Number(s.manualInstallmentValue) : undefined,
  }));
  
  // State for new simulation form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    totalValue: "",
    downPayment: "",
    installments: "1",
    startDate: new Date().toISOString().split('T')[0],
    category: "Outros" as Category,
    interestRate: "",
    manualInstallmentValue: ""
  });

  // Calculate base monthly averages (Income vs Fixed Expenses)
  // In a real app, this would be more complex. Here we infer from "recurring" looking transactions or just use averages.
  // For simplicity, let's look at the last 3 months average.
  const baseFinancials = useMemo(() => {
    // This is a simplified projection engine
    // It assumes current average income/expenses continue
    // It overlays existing future transactions (pending)
    // It overlays the simulation
    
    // 1. Get average monthly income/expense from last 3 months
    // For mockup: Using fixed hypothetical values based on store initial data if not enough history
    const avgIncome = 3500; 
    const avgFixedExpense = 2000; // Rent, food, etc.
    const currentBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    return { avgIncome, avgFixedExpense, currentBalance };
  }, [accounts, transactions]);

  // Generate Projection Data (Next 12 Months)
  const projectionData = useMemo(() => {
    const months = 12;
    const data = [];
    let runningBalance = baseFinancials.currentBalance;
    let simulatedRunningBalance = baseFinancials.currentBalance;

    for (let i = 0; i < months; i++) {
        const currentDate = addMonths(new Date(), i);
        const monthKey = format(currentDate, 'MMM');
        
        // 1. Base Cash Flow
        // Find actual pending transactions for this month
        const pendingForMonth = transactions.filter(t => 
            t.status === 'pending' && 
            isSameMonth(new Date(t.date), currentDate)
        );
        
        const monthlyPendingIncome = pendingForMonth
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0);
            
        const monthlyPendingExpense = pendingForMonth
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        // If we have pending data, use it. If not (future undefined months), use averages.
        // Logic: specific pending transactions override averages? Or add to them? 
        // Best approach for simulator: Use Average Income - Average Expense as a baseline "Savings Potential"
        // Then subtract specific Debt/Installments.
        
        // Let's simplify:
        // Net Change = Avg Income - Avg Expense
        const netChange = baseFinancials.avgIncome - baseFinancials.avgFixedExpense;
        
        // Real Projection
        runningBalance += netChange;

        // Simulation Impact
        let simulationCost = 0;
        
        // Calculate cost of ALL active simulations for this month
        // + The temporary form simulation if it's valid
        const activeSimulations = [...simulations];
        if (showForm && formData.totalValue) {
            activeSimulations.push({
                id: 'temp',
                name: formData.name || 'Nova Simulação',
                totalValue: Number(formData.totalValue),
                downPayment: Number(formData.downPayment || 0),
                installments: Number(formData.installments || 1),
                startDate: formData.startDate,
                category: formData.category,
                type: 'purchase',
                createdAt: new Date().toISOString(),
                interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
                manualInstallmentValue: formData.manualInstallmentValue ? Number(formData.manualInstallmentValue) : undefined
            });
        }

        activeSimulations.forEach(sim => {
            const simStart = new Date(sim.startDate);
            const simEnd = addMonths(simStart, sim.installments + (sim.downPayment > 0 ? 0 : -1)); // Rough approx
            
            // Check if this month is the down payment month
            if (isSameMonth(currentDate, simStart) && sim.downPayment > 0) {
                simulationCost += sim.downPayment;
            }
            
            // Check if this month has an installment
            // Installment usually starts next month after down payment, or same month if no down payment?
            // Let's assume: Down payment at T0. Installment 1 at T+1.
            const firstInstallmentDate = sim.downPayment > 0 ? addMonths(simStart, 1) : simStart;
            
            const monthDiff = (currentDate.getFullYear() - firstInstallmentDate.getFullYear()) * 12 + (currentDate.getMonth() - firstInstallmentDate.getMonth());
            
            if (monthDiff >= 0 && monthDiff < sim.installments) {
                // Calculate Installment Value
                let installmentValue = 0;
                
                if (sim.manualInstallmentValue) {
                    // User manually set the installment value
                    installmentValue = sim.manualInstallmentValue;
                } else if (sim.interestRate && sim.interestRate > 0) {
                    // Calculate using Price Table (PMT)
                    // PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
                    const pv = sim.totalValue - sim.downPayment;
                    const i = sim.interestRate / 100;
                    const n = sim.installments;
                    
                    if (pv > 0) {
                        installmentValue = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                    }
                } else {
                    // Simple division (no interest)
                    installmentValue = (sim.totalValue - sim.downPayment) / sim.installments;
                }
                
                simulationCost += installmentValue;
            }
        });

        simulatedRunningBalance = runningBalance - simulationCost; // Base balance already incremented, so we subtract simulation cost from that base? No.
        // Base line: Balance
        // Simulated line: Balance - Cumulative Cost of Simulation?
        // Actually: 
        // Real Path: Balance[t] = Balance[t-1] + NetChange
        // Sim Path: Balance[t] = SimBalance[t-1] + NetChange - SimCosts[t]
        
        // We need to re-calculate simulatedRunningBalance iteratively correctly
        if (i === 0) {
            // First month
            runningBalance = baseFinancials.currentBalance + netChange;
            simulatedRunningBalance = baseFinancials.currentBalance + netChange - simulationCost;
        } else {
            // Subsequent months
            // We need to carry over the 'simulated' state
            // Let's fix the loop logic above to be iterative properly
        }
        
        data.push({
            month: monthKey,
            originalBalance: runningBalance, // We will fix values in a second pass or loop fix
            simulatedBalance: 0, // placeholder
            simulationCost: simulationCost,
            netChange: netChange
        });
    }

    // Correct Iterative Calculation
    let rb = baseFinancials.currentBalance;
    let srb = baseFinancials.currentBalance;

    return data.map(d => {
        rb += d.netChange;
        srb += d.netChange - d.simulationCost;
        return {
            ...d,
            originalBalance: rb,
            simulatedBalance: srb
        };
    });

  }, [baseFinancials, transactions, simulations, showForm, formData]);

  const handleSave = async () => {
    if (!formData.name || !formData.totalValue) {
        toast({ title: "Preencha os dados obrigatórios", variant: "destructive" });
        return;
    }
    
    const payload = {
        name: formData.name,
        totalValue: String(formData.totalValue),
        downPayment: String(formData.downPayment || 0),
        installments: Number(formData.installments),
        startDate: formData.startDate,
        category: formData.category,
        type: 'purchase',
        interestRate: formData.interestRate ? String(formData.interestRate) : undefined,
        manualInstallmentValue: formData.manualInstallmentValue ? String(formData.manualInstallmentValue) : undefined
    };

    try {
      if (editingId) {
          await updateSimulationMutation.mutateAsync({ id: editingId, data: payload });
          toast({ title: "Simulação atualizada!" });
      } else {
          await createSimulationMutation.mutateAsync(payload);
          toast({ title: "Simulação salva!" });
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
          name: "",
          totalValue: "",
          downPayment: "",
          installments: "1",
          startDate: new Date().toISOString().split('T')[0],
          category: "Outros" as Category,
          interestRate: "",
          manualInstallmentValue: ""
      });
    } catch (error) {
      toast({ title: "Erro ao salvar simulação", variant: "destructive" });
    }
  };

  const handleEdit = (sim: Simulation) => {
    setFormData({
        name: sim.name,
        totalValue: sim.totalValue.toString(),
        downPayment: sim.downPayment.toString(),
        installments: sim.installments.toString(),
        startDate: sim.startDate,
        category: sim.category,
        interestRate: sim.interestRate?.toString() || "",
        manualInstallmentValue: sim.manualInstallmentValue?.toString() || ""
    });
    setEditingId(sim.id);
    setShowForm(true);
  };

  const handleApply = async (id: string) => {
      toast({ title: "Funcionalidade em desenvolvimento", description: "A conversão de simulação para lançamentos reais será implementada em breve." });
  };
  
  const handleDelete = async (id: string) => {
      try {
        await deleteSimulationMutation.mutateAsync(id);
        toast({ title: "Simulação removida!" });
      } catch (error) {
        toast({ title: "Erro ao remover", variant: "destructive" });
      }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black min-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 p-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-purple-600" />
                        Simulador de Decisão
                    </h1>
                    <p className="text-xs text-gray-500">Teste antes de comprar</p>
                </div>
            </div>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-24">
            
            {/* Action Card: Create Simulation */}
            {!showForm ? (
                <Button 
                    className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none"
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            name: "",
                            totalValue: "",
                            downPayment: "",
                            installments: "1",
                            startDate: new Date().toISOString().split('T')[0],
                            category: "Outros" as Category,
                            interestRate: "",
                            manualInstallmentValue: ""
                        });
                        setShowForm(true);
                    }}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Simulação
                </Button>
            ) : (
                <Card className="border-purple-200 dark:border-purple-900/50 shadow-md animate-in slide-in-from-top-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-purple-900 dark:text-purple-300">Detalhes da Compra</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>O que você quer comprar?</Label>
                            <Input 
                                placeholder="Ex: iPhone 15, Moto, Viagem..." 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor Total</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                    <Input 
                                        type="number" 
                                        className="pl-9" 
                                        placeholder="0,00"
                                        value={formData.totalValue}
                                        onChange={e => setFormData({...formData, totalValue: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Entrada (se houver)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                    <Input 
                                        type="number" 
                                        className="pl-9" 
                                        placeholder="0,00"
                                        value={formData.downPayment}
                                        onChange={e => setFormData({...formData, downPayment: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Parcelas</Label>
                                <Select value={formData.installments.toString()} onValueChange={v => setFormData({...formData, installments: v})}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1,2,3,4,5,6,10,12,18,24,36,48,60].map(n => (
                                            <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Input 
                                    type="date" 
                                    value={formData.startDate}
                                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Advanced Options: Interest & Manual Installment */}
                        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800">
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Juros Mensal (%)</Label>
                                <div className="relative">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                                    <Input 
                                        type="number" 
                                        className="pr-8 h-9 text-sm" 
                                        placeholder="0.00"
                                        value={formData.interestRate}
                                        onChange={e => setFormData({...formData, interestRate: e.target.value})}
                                        disabled={!!formData.manualInstallmentValue}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">Valor da Parcela (Se souber)</Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">R$</span>
                                    <Input 
                                        type="number" 
                                        className="pl-7 h-9 text-sm" 
                                        placeholder="Automático"
                                        value={formData.manualInstallmentValue}
                                        onChange={e => setFormData({...formData, manualInstallmentValue: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={() => {
                                setShowForm(false);
                                setEditingId(null);
                                setFormData({
                                    name: "",
                                    totalValue: "",
                                    downPayment: "",
                                    installments: "1",
                                    startDate: new Date().toISOString().split('T')[0],
                                    category: "Outros" as Category,
                                    interestRate: "",
                                    manualInstallmentValue: ""
                                });
                            }}>Cancelar</Button>
                            <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                                <Save className="w-4 h-4 mr-2" /> {editingId ? 'Atualizar' : 'Salvar'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analysis Chart */}
            {(simulations.length > 0 || (showForm && formData.totalValue)) && (
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-gray-500" />
                        Impacto no Futuro
                    </h3>
                    
                    <div className="h-[250px] w-full bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOriginal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="originalBalance" 
                                    stroke="#22c55e" 
                                    fillOpacity={1} 
                                    fill="url(#colorOriginal)" 
                                    name="Saldo Atual"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="simulatedBalance" 
                                    stroke="#9333ea" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorSimulated)" 
                                    name="Com Compra"
                                />
                                <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Insights */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                            <CardContent className="p-4">
                                <p className="text-xs text-red-600/80 dark:text-red-400 font-medium mb-1">Menor Saldo Projetado</p>
                                <p className="text-lg font-bold text-red-700 dark:text-red-300">
                                    {formatCurrency(Math.min(...projectionData.map(d => d.simulatedBalance)))}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30">
                            <CardContent className="p-4">
                                <p className="text-xs text-purple-600/80 dark:text-purple-400 font-medium mb-1">Parcela Mensal</p>
                                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                    {formatCurrency((
                                        // Show installment of current edit or first sim
                                        (() => {
                                            const sim = showForm && formData.totalValue ? {
                                                totalValue: Number(formData.totalValue),
                                                downPayment: Number(formData.downPayment || 0),
                                                installments: Number(formData.installments || 1),
                                                interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
                                                manualInstallmentValue: formData.manualInstallmentValue ? Number(formData.manualInstallmentValue) : undefined
                                            } : simulations.length > 0 ? simulations[0] : null;

                                            if (!sim) return 0;

                                            if (sim.manualInstallmentValue) return sim.manualInstallmentValue;
                                            
                                            if (sim.interestRate && sim.interestRate > 0) {
                                                const pv = sim.totalValue - sim.downPayment;
                                                const i = sim.interestRate / 100;
                                                const n = sim.installments;
                                                if (pv <= 0) return 0;
                                                return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                                            }

                                            return (sim.totalValue - sim.downPayment) / sim.installments;
                                        })()
                                    ))}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                     {Math.min(...projectionData.map(d => d.simulatedBalance)) < 0 && (
                        <div className="flex items-start gap-3 p-4 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div className="text-sm">
                                <span className="font-bold">Risco de Saldo Negativo!</span>
                                <p className="text-xs opacity-90 mt-1">Essa compra pode deixar sua conta negativa em alguns meses. Considere aumentar a entrada ou o número de parcelas.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Saved Simulations List */}
            {simulations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">Simulações Salvas</h3>
                    {simulations.map(sim => (
                        <div key={sim.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{sim.name}</h4>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <p className="text-xs text-gray-500">
                                            Valor Inicial: {formatCurrency(sim.totalValue)}
                                        </p>
                                        {sim.downPayment > 0 && (
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                Entrada: {formatCurrency(sim.downPayment)}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            {sim.installments}x de {formatCurrency((
                                                (() => {
                                                    if (sim.manualInstallmentValue) return sim.manualInstallmentValue;
                                                    if (sim.interestRate && sim.interestRate > 0) {
                                                        const pv = sim.totalValue - sim.downPayment;
                                                        const i = sim.interestRate / 100;
                                                        const n = sim.installments;
                                                        return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                                                    }
                                                    return (sim.totalValue - sim.downPayment) / sim.installments;
                                                })()
                                            ))}
                                            {sim.interestRate ? ` (${sim.interestRate}% a.m.)` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-0.5">Valor Final</p>
                                    <p className="font-bold text-purple-600 text-lg">{formatCurrency(
                                        // Display Total Cost (with interest if applicable)
                                        sim.downPayment + (sim.installments * (() => {
                                            if (sim.manualInstallmentValue) return sim.manualInstallmentValue;
                                            if (sim.interestRate && sim.interestRate > 0) {
                                                const pv = sim.totalValue - sim.downPayment;
                                                const i = sim.interestRate / 100;
                                                const n = sim.installments;
                                                return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                                            }
                                            return (sim.totalValue - sim.downPayment) / sim.installments;
                                        })())
                                    )}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(sim.startDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-zinc-800">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                    onClick={() => handleApply(sim.id)}
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> Efetivar
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="px-3 border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
                                    onClick={() => handleEdit(sim)}
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="px-3 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    onClick={() => handleDelete(sim.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </MobileLayout>
  );
}
