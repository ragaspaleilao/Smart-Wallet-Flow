import { MobileLayout } from "@/components/mobile-layout";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Wallet, CreditCard, Bell, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useBudget, useUpdateBudget, useTransactions } from "@/hooks/use-api";

export default function Budget() {
  const [_, setLocation] = useLocation();
  const { data: budgetData, isLoading: budgetLoading } = useBudget();
  const { data: transactions = [] } = useTransactions();
  const updateBudgetMutation = useUpdateBudget();
  
  const budget = budgetData ? {
    spendingLimit: Number(budgetData.spendingLimit) || 0,
    creditLimit: Number(budgetData.creditLimit) || 0,
    income: Number(budgetData.income) || 0,
    alertThresholds: budgetData.alertThresholds || [70, 90]
  } : { spendingLimit: 0, creditLimit: 0, income: 0, alertThresholds: [70, 90] };
  
  const [localBudget, setLocalBudget] = useState(budget);

  useEffect(() => {
    if (budgetData) {
      setLocalBudget({
        spendingLimit: Number(budgetData.spendingLimit) || 0,
        creditLimit: Number(budgetData.creditLimit) || 0,
        income: Number(budgetData.income) || 0,
        alertThresholds: budgetData.alertThresholds || [70, 90]
      });
    }
  }, [budgetData]);

  // Calculate expenses for the CURRENT MONTH only
  const currentMonthExpense = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return (
          t.type === 'expense' &&
          t.status === 'paid' &&
          t.isPersonal !== false &&
          isWithinInterval(tDate, { start, end })
        );
      })
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [transactions]);

  const handleSave = async () => {
    try {
      await updateBudgetMutation.mutateAsync({
        spendingLimit: String(localBudget.spendingLimit),
        creditLimit: String(localBudget.creditLimit),
        income: String(localBudget.income),
        alertThresholds: localBudget.alertThresholds,
      });
      toast({ title: "Orçamento atualizado!" });
      setLocation("/dashboard");
    } catch (error) {
      toast({ title: "Erro ao salvar orçamento", variant: "destructive" });
    }
  };
  
  if (budgetLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  const spendingPercentage = localBudget.spendingLimit > 0 
    ? Math.min(100, Math.round((currentMonthExpense / localBudget.spendingLimit) * 100))
    : 0;

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Orçamento e Limites</h1>
          <div className="w-10" />
        </div>

        <div className="space-y-8">
          {/* Main Limits */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Limite de Gastos</h3>
              </div>
              
              <Card className="p-4 border-none shadow-sm bg-gray-50 dark:bg-zinc-900">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Gasto Atual (Mês)</span>
                  <span className="font-bold">{formatCurrency(currentMonthExpense)}</span>
                </div>
                <Progress value={spendingPercentage} className="h-3 mb-2" />
                <div className="flex justify-between items-center text-xs text-gray-400">
                   <span>0%</span>
                   <span>{spendingPercentage}%</span>
                   <span>100%</span>
                </div>
              </Card>

              <div className="space-y-2">
                 <Label>Definir Limite Mensal (R$)</Label>
                 <Input 
                   type="number"
                   value={localBudget.spendingLimit}
                   onChange={(e) => setLocalBudget({...localBudget, spendingLimit: Number(e.target.value)})}
                   className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 font-bold"
                 />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-lg">Limite do Cartão</h3>
              </div>
              <div className="space-y-2">
                 <Label>Limite Total (R$)</Label>
                 <Input 
                   type="number"
                   value={localBudget.creditLimit}
                   onChange={(e) => setLocalBudget({...localBudget, creditLimit: Number(e.target.value)})}
                   className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                 />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-lg">Renda Mensal Estimada</h3>
              </div>
              <div className="space-y-2">
                 <Label>Valor (R$)</Label>
                 <Input 
                   type="number"
                   value={localBudget.income}
                   onChange={(e) => setLocalBudget({...localBudget, income: Number(e.target.value)})}
                   className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                 />
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
             <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-lg">Alertas</h3>
             </div>
             
             <div className="space-y-6 px-2">
                <div className="space-y-3">
                   <div className="flex justify-between">
                      <Label>Alerta de Atenção</Label>
                      <span className="text-sm font-bold text-orange-500">{localBudget.alertThresholds[0]}%</span>
                   </div>
                   <Slider 
                      value={[localBudget.alertThresholds[0]]} 
                      max={100} 
                      step={5} 
                      onValueChange={(val) => {
                        const newThresholds = [...localBudget.alertThresholds];
                        newThresholds[0] = val[0];
                        setLocalBudget({...localBudget, alertThresholds: newThresholds});
                      }}
                   />
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between">
                      <Label>Alerta Crítico</Label>
                      <span className="text-sm font-bold text-red-500">{localBudget.alertThresholds[1]}%</span>
                   </div>
                   <Slider 
                      value={[localBudget.alertThresholds[1]]} 
                      max={100} 
                      step={5} 
                      onValueChange={(val) => {
                        const newThresholds = [...localBudget.alertThresholds];
                        newThresholds[1] = val[0];
                        setLocalBudget({...localBudget, alertThresholds: newThresholds});
                      }}
                   />
                </div>
             </div>
          </div>

          <Button size="lg" className="w-full h-14 text-lg mt-8" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
