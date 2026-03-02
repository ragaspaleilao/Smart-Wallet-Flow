import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Category } from "@/lib/store";
import { ArrowLeft, Calculator, Calendar, CreditCard, DollarSign, Plus, Save, Trash2, CheckCircle2, AlertTriangle, TrendingDown, Pencil, Loader2, Info } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth, subMonths, isAfter, isBefore } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useSimulations, useCreateSimulation, useUpdateSimulation, useDeleteSimulation, useTransactions, useAccounts, useCreditCards, useCreditPurchases, useSubscriptions } from "@/hooks/use-api";

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

export default function Simulator({ showNav = true }: { showNav?: boolean }) {
  const [location, setLocation] = useLocation();
  const { data: transactionsData = [] } = useTransactions();
  const { data: accountsData = [] } = useAccounts();
  const { data: simulationsData = [], isLoading } = useSimulations();
  const { data: creditCardsData = [] } = useCreditCards();
  const { data: creditPurchasesData = [] } = useCreditPurchases();
  const { data: subscriptionsData = [] } = useSubscriptions();
  const createSimulationMutation = useCreateSimulation();
  const updateSimulationMutation = useUpdateSimulation();
  const deleteSimulationMutation = useDeleteSimulation();
  
  const transactions = transactionsData;
  const accounts = accountsData;
  const creditCards = creditCardsData;
  const creditPurchases = creditPurchasesData;
  const subscriptionsList = subscriptionsData;
  const simulations: Simulation[] = (simulationsData || []).map((s: any) => ({
    ...s,
    totalValue: Number(s.totalValue),
    downPayment: Number(s.downPayment),
    installments: Number(s.installments),
    interestRate: s.interestRate ? Number(s.interestRate) : undefined,
    manualInstallmentValue: s.manualInstallmentValue ? Number(s.manualInstallmentValue) : undefined,
  }));
  
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

  const baseFinancials = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);

    const paidTransactions = transactions.filter(t => 
      t.status === 'paid' && isAfter(new Date(t.date), threeMonthsAgo) && isBefore(new Date(t.date), now)
    );

    const nonCreditTransactions = paidTransactions.filter(t => !t.creditCardId);

    const totalIncome = nonCreditTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);
    
    const totalExpense = nonCreditTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const monthsWithData = new Set(
      paidTransactions.map(t => format(new Date(t.date), 'yyyy-MM'))
    ).size;

    const divisor = Math.max(monthsWithData, 1);
    const avgIncome = totalIncome / divisor;
    const avgExpense = totalExpense / divisor;

    const currentBalance = accounts.reduce((acc, curr) => {
      const initialBalance = Number(curr.initialBalance || curr.balance || 0);
      const accountIncome = transactions
        .filter(t => t.accountId === curr.id && t.type === 'income' && t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const accountExpense = transactions
        .filter(t => t.accountId === curr.id && t.type === 'expense' && t.status === 'paid')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return acc + initialBalance + accountIncome - accountExpense;
    }, 0);

    return { avgIncome, avgExpense, currentBalance };
  }, [accounts, transactions]);

  const dataSources = useMemo(() => {
    const sources: string[] = [];
    if (transactions.length > 0) sources.push(`${transactions.length} lançamentos`);
    if (creditPurchases.length > 0) sources.push(`${creditPurchases.length} compras no cartão`);
    if (subscriptionsList.length > 0) sources.push(`${subscriptionsList.length} assinaturas`);
    if (accounts.length > 0) sources.push(`${accounts.length} contas`);
    return sources;
  }, [transactions, creditPurchases, subscriptionsList, accounts]);

  const projectionData = useMemo(() => {
    const months = 12;
    const now = new Date();

    const subscriptionCreditCardIds = new Set(
      subscriptionsList
        .filter(sub => sub.creditCardId && sub.paymentMethod === 'credit')
        .map(sub => sub.creditCardId)
    );
    const subscriptionAccountIds = new Set(
      subscriptionsList
        .filter(sub => sub.accountId && sub.paymentMethod !== 'credit')
        .map(sub => sub.accountId)
    );

    const monthlyData: Array<{
      month: string;
      netChange: number;
      simulationCost: number;
      originalBalance: number;
      simulatedBalance: number;
      details: {
        avgIncome: number;
        avgExpense: number;
        pendingIncome: number;
        pendingExpense: number;
        creditCardCost: number;
        subscriptionCost: number;
      };
    }> = [];

    let rb = baseFinancials.currentBalance;
    let srb = baseFinancials.currentBalance;

    for (let i = 0; i < months; i++) {
      const projMonth = addMonths(now, i);
      const monthKey = format(projMonth, 'MMM');
      const projMonthStart = startOfMonth(projMonth);
      const projMonthEnd = endOfMonth(projMonth);

      const pendingForMonth = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.status === 'pending' && 
          !t.creditCardId &&
          isAfter(tDate, projMonthStart) && 
          isBefore(tDate, projMonthEnd);
      });

      const pendingIncome = pendingForMonth
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0);

      const pendingExpense = pendingForMonth
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

      let creditCardCost = 0;

      const activePurchases = (creditPurchases as any[]).filter((cp: any) => cp.status === 'active');
      activePurchases.forEach((purchase: any) => {
        const purchaseDate = new Date(purchase.purchaseDate);
        const totalInstallments = Number(purchase.installments);
        const installmentValue = Number(purchase.installmentValue);

        const monthDiff = (projMonth.getFullYear() - purchaseDate.getFullYear()) * 12 +
          (projMonth.getMonth() - purchaseDate.getMonth());

        if (monthDiff >= 0 && monthDiff < totalInstallments) {
          creditCardCost += installmentValue;
        }
      });

      const pendingCreditTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.creditCardId && 
          t.status === 'pending' &&
          t.type === 'expense' &&
          isSameMonth(tDate, projMonth);
      });
      
      pendingCreditTransactions.forEach(t => {
        const alreadyCounted = activePurchases.some((cp: any) => {
          const cpDate = new Date(cp.purchaseDate);
          return cp.creditCardId === t.creditCardId && 
            Math.abs(Number(cp.installmentValue) - Number(t.amount)) < 0.01 &&
            isSameMonth(cpDate, new Date(t.date));
        });
        if (!alreadyCounted) {
          creditCardCost += Number(t.amount);
        }
      });

      let subscriptionCost = 0;
      subscriptionsList.forEach((sub: any) => {
        const subPrice = Number(sub.price || 0);
        if (subPrice <= 0) return;

        const isOnCreditCard = sub.creditCardId && sub.paymentMethod === 'credit';

        if (isOnCreditCard) {
          const alreadyInPurchases = activePurchases.some((cp: any) =>
            cp.creditCardId === sub.creditCardId &&
            Math.abs(Number(cp.installmentValue) - subPrice) < 0.01
          );

          const alreadyInPendingCredit = pendingCreditTransactions.some(t =>
            t.creditCardId === sub.creditCardId &&
            Math.abs(Number(t.amount) - subPrice) < 0.01
          );

          if (!alreadyInPurchases && !alreadyInPendingCredit) {
            creditCardCost += subPrice;
          }
        } else {
          const alreadyInPending = pendingForMonth.some(t =>
            Math.abs(Number(t.amount) - subPrice) < 0.5 &&
            (t.description || '').toLowerCase().includes((sub.name || '').toLowerCase().substring(0, 4))
          );

          if (!alreadyInPending) {
            subscriptionCost += subPrice;
          }
        }
      });

      const hasPendingData = pendingForMonth.length > 0;
      const monthIncome = hasPendingData 
        ? pendingIncome 
        : baseFinancials.avgIncome;
      const monthExpenseBase = hasPendingData 
        ? pendingExpense 
        : baseFinancials.avgExpense;

      const netChange = monthIncome - monthExpenseBase - creditCardCost - subscriptionCost;

      let simulationCost = 0;
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

        if (isSameMonth(projMonth, simStart) && sim.downPayment > 0) {
          simulationCost += sim.downPayment;
        }

        const firstInstallmentDate = sim.downPayment > 0 ? addMonths(simStart, 1) : simStart;
        const monthDiff = (projMonth.getFullYear() - firstInstallmentDate.getFullYear()) * 12 +
          (projMonth.getMonth() - firstInstallmentDate.getMonth());

        if (monthDiff >= 0 && monthDiff < sim.installments) {
          let installmentValue = 0;
          if (sim.manualInstallmentValue) {
            installmentValue = sim.manualInstallmentValue;
          } else if (sim.interestRate && sim.interestRate > 0) {
            const pv = sim.totalValue - sim.downPayment;
            const rate = sim.interestRate / 100;
            const n = sim.installments;
            if (pv > 0) {
              installmentValue = pv * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
            }
          } else {
            installmentValue = (sim.totalValue - sim.downPayment) / sim.installments;
          }
          simulationCost += installmentValue;
        }
      });

      rb += netChange;
      srb += netChange - simulationCost;

      monthlyData.push({
        month: monthKey,
        netChange,
        simulationCost,
        originalBalance: rb,
        simulatedBalance: srb,
        details: {
          avgIncome: baseFinancials.avgIncome,
          avgExpense: baseFinancials.avgExpense,
          pendingIncome,
          pendingExpense,
          creditCardCost,
          subscriptionCost,
        }
      });
    }

    return monthlyData;
  }, [baseFinancials, transactions, simulations, showForm, formData, creditPurchases, subscriptionsList]);

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
    const rawDate = String(sim.startDate);
    const dateOnly = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
    setFormData({
        name: sim.name,
        totalValue: sim.totalValue.toString(),
        downPayment: sim.downPayment.toString(),
        installments: sim.installments.toString(),
        startDate: dateOnly,
        category: sim.category,
        interestRate: sim.interestRate?.toString() || "",
        manualInstallmentValue: sim.manualInstallmentValue?.toString() || ""
    });
    setEditingId(sim.id);
    setShowForm(true);
  };

  const handleApply = async (id: string) => {
    const sim = simulations.find(s => s.id === id);
    if (!sim) return;

    try {
      const installments = Number(sim.installments);
      const startDate = new Date(sim.startDate);
      const totalValue = Number(sim.totalValue);
      const downPayment = Number(sim.downPayment);
      
      let installmentValue = 0;
      if (sim.manualInstallmentValue) {
        installmentValue = Number(sim.manualInstallmentValue);
      } else if (sim.interestRate && Number(sim.interestRate) > 0) {
        const pv = totalValue - downPayment;
        const i = Number(sim.interestRate) / 100;
        const n = installments;
        if (pv > 0) {
          installmentValue = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
        }
      } else {
        installmentValue = (totalValue - downPayment) / installments;
      }

      // Create initial down payment transaction if exists
      if (downPayment > 0) {
        await createTransactionMutation.mutateAsync({
          amount: String(downPayment),
          type: 'expense',
          category: sim.category,
          description: `${sim.name} (Entrada)`,
          date: startDate.toISOString(),
          source: 'manual',
          isPersonal: true,
          status: 'paid',
          paymentMethod: 'debit',
          accountId: accounts[0]?.id // Default to first account
        });
      }

      // Create installment transactions
      const firstInstallmentDate = downPayment > 0 ? addMonths(startDate, 1) : startDate;
      
      for (let i = 0; i < installments; i++) {
        const dueDate = addMonths(firstInstallmentDate, i);
        await createTransactionMutation.mutateAsync({
          amount: String(installmentValue.toFixed(2)),
          type: 'expense',
          category: sim.category,
          description: `${sim.name} (${i + 1}/${installments})`,
          date: dueDate.toISOString(),
          source: 'manual',
          isPersonal: true,
          status: 'pending',
          paymentMethod: 'debit',
          accountId: accounts[0]?.id // Default to first account
        });
      }

      // Delete the simulation after effective
      await deleteSimulationMutation.mutateAsync(id);
      
      toast({ 
        title: "Compra efetivada!", 
        description: `${installments} lançamentos foram criados no seu extrato.` 
      });
      
      setLocation("/transactions");
    } catch (error) {
      console.error('Error effecting simulation:', error);
      toast({ 
        title: "Erro ao efetivar", 
        description: "Ocorreu um erro ao criar os lançamentos.",
        variant: "destructive" 
      });
    }
  };
  
  const handleDelete = async (id: string) => {
      try {
        await deleteSimulationMutation.mutateAsync(id);
        if (editingId === id) {
          setEditingId(null);
          setShowForm(false);
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
        }
        toast({ title: "Simulação removida!" });
      } catch (error) {
        toast({ title: "Erro ao remover", variant: "destructive" });
      }
  };

  if (showForm && !showNav) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-black min-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 p-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setShowForm(false)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-purple-600" />
                        Nova Simulação
                    </h1>
                </div>
            </div>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-24">
            <Card className="border-purple-200 dark:border-purple-900/50 shadow-md">
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

                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Salvar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  const content = (
    <div className={cn("flex-1 flex flex-col", showNav ? "" : "bg-transparent")}>
        {showNav && (
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
        )}

        <div className={cn("space-y-6 flex-1", showNav ? "p-4 pb-24 overflow-y-auto" : "")}>
            
            {/* Action Card: Create Simulation */}
            {showNav && !showForm && (
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
            )}

            {showForm && showNav ? (
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
            ) : null}

            {/* Data Sources Info */}
            {dataSources.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Dados integrados:</span>{' '}
                  {dataSources.join(' · ')}
                  <p className="mt-1 text-blue-600/70 dark:text-blue-400/60">
                    Receita média: {formatCurrency(baseFinancials.avgIncome)}/mês · Despesa média: {formatCurrency(baseFinancials.avgExpense)}/mês · Saldo atual: {formatCurrency(baseFinancials.currentBalance)}
                  </p>
                </div>
              </div>
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
                                <Tooltip 
                                    content={({ active, payload, label }: any) => {
                                        if (!active || !payload?.length) return null;
                                        const data = payload[0]?.payload;
                                        if (!data) return null;
                                        return (
                                            <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 text-xs space-y-1.5">
                                                <p className="font-bold text-gray-900 dark:text-white">{label}</p>
                                                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                                    <p>Saldo sem compra: <span className="text-green-600 font-medium">{formatCurrency(data.originalBalance)}</span></p>
                                                    <p>Saldo com compra: <span className="text-purple-600 font-medium">{formatCurrency(data.simulatedBalance)}</span></p>
                                                    {data.details?.creditCardCost > 0 && (
                                                        <p>Cartões de crédito: <span className="text-orange-600 font-medium">-{formatCurrency(data.details.creditCardCost)}</span></p>
                                                    )}
                                                    {data.details?.subscriptionCost > 0 && (
                                                        <p>Assinaturas: <span className="text-pink-600 font-medium">-{formatCurrency(data.details.subscriptionCost)}</span></p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
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
                                    <p className="text-[10px] text-gray-400 mt-1">{(() => { try { const raw = String(sim.startDate); const dateStr = raw.includes('T') ? raw.split('T')[0] : raw; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; } catch { return String(sim.startDate); } })()}</p>
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
  );

  if (showNav) {
    return (
      <MobileLayout showNav={false}>
        {content}
      </MobileLayout>
    );
  }

  return content;
}
