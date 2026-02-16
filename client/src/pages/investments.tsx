import { MobileLayout } from "@/components/mobile-layout";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PieChart, TrendingUp, Plus, Calendar as CalendarIcon, Calculator, Trash2, Save, Info, Wand2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { format, addMonths, differenceInDays, differenceInMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvestments, useCreateInvestment, useUpdateInvestment, useDeleteInvestment, useAccountsWithBalance, useCreateTransaction } from "@/hooks/use-api";

interface Investment {
  id: string;
  name: string;
  value: number;
  yield: number;
  yieldRate: number;
  startDate?: string;
  hasTax?: boolean;
  accountId?: string | null;
}

export default function Investments() {
  const { data: apiInvestments = [], isLoading: investmentsLoading } = useInvestments();
  const { data: apiAccounts = [] } = useAccountsWithBalance();
  
  const createInvestmentMutation = useCreateInvestment();
  const updateInvestmentMutation = useUpdateInvestment();
  const deleteInvestmentMutation = useDeleteInvestment();
  const createTransactionMutation = useCreateTransaction();
  
  const investments: Investment[] = apiInvestments.map(i => ({
    ...i,
    value: parseFloat(String(i.value)),
    yield: parseFloat(String(i.yield || 0)),
    yieldRate: parseFloat(String(i.yieldRate || 0)),
  }));
  const accounts = apiAccounts.map(a => ({ ...a, balance: parseFloat(a.balance) }));
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    value: string;
    yield: string;
    yieldRate: string;
    startDate: string;
    hasTax: boolean;
    accountId: string; // New field
  }>({ 
    name: "", 
    value: "", 
    yield: "", 
    yieldRate: "0.85", // Default ~10% a.a
    startDate: new Date().toISOString().split('T')[0],
    hasTax: false,
    accountId: "none"
  });
  
  // Transaction creation state
  const [createTransaction, setCreateTransaction] = useState(false);
  const [transactionSourceAccountId, setTransactionSourceAccountId] = useState<string>("");

  useEffect(() => {
      if (accounts.length > 0 && !transactionSourceAccountId) {
          setTransactionSourceAccountId(accounts[0].id);
      }
  }, [accounts]);

  // Projection State
  const [projectionDate, setProjectionDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));

  const computeValueWithYieldToNow = (initialValue: number, monthlyRatePercent: number, startISO?: string) => {
    const startDate = startISO ? new Date(startISO) : new Date();
    const now = new Date();
    const days = differenceInDays(now, startDate);
    const months = differenceInMonths(now, startDate);

    if (days <= 0 || !Number.isFinite(initialValue) || !Number.isFinite(monthlyRatePercent)) {
      return { nextValue: initialValue, profit: 0, days: Math.max(0, days), months: Math.max(0, months) };
    }

    const monthlyRate = monthlyRatePercent / 100;
    const nextValue = initialValue * Math.pow(1 + monthlyRate, months + (days % 30) / 30);
    const profit = nextValue - initialValue;

    return { nextValue, profit, days, months };
  };

  // Calculate total: If linked, use Account Balance. Else use manual value.
  const totalInvested = investments.reduce((acc, curr) => {
      if (curr.accountId) {
          const account = accounts.find(a => a.id === curr.accountId);
          return acc + (account ? account.balance : curr.value);
      }
      return acc + curr.value;
  }, 0);

  const formatCurrencyInput = (val: string) => {
    const number = val.replace(/\D/g, "");
    return (Number(number) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSave = async () => {
    // If account linked, name and value might be optional or auto-filled
    if ((!formData.accountId || formData.accountId === "none") && (!formData.name || !formData.value)) {
        toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
        return;
    }

    const linkedAccount = formData.accountId !== "none" ? accounts.find(a => a.id === formData.accountId) : null;
    
    // If linked, value comes from account. 
    // We store the current value anyway, but UI will prefer account balance.
    // Parse manual value if not linked
    const manualValue = Number(formData.value.replace(/\D/g, "")) / 100;
    
    const finalValue = linkedAccount ? linkedAccount.balance : manualValue;
    const finalName = linkedAccount ? (formData.name || linkedAccount.name) : formData.name;

    const payload = {
        name: finalName,
        value: finalValue,
        yield: `+${formData.yieldRate}%`,
        yieldRate: Number(formData.yieldRate),
        startDate: formData.startDate,
        hasTax: formData.hasTax,
        isPersonal: true,
        accountId: formData.accountId !== "none" ? formData.accountId : undefined,
        lastYieldAppliedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
          await updateInvestmentMutation.mutateAsync({ id: editingId, data: {
            name: payload.name,
            value: String(payload.value),
            yield: String(payload.yield),
            yieldRate: String(payload.yieldRate),
            startDate: payload.startDate,
            hasTax: payload.hasTax,
            accountId: payload.accountId,
          }});
          toast({ title: "Investimento atualizado!" });
      } else {
          await createInvestmentMutation.mutateAsync({
            name: payload.name,
            value: String(payload.value),
            yield: String(payload.yield),
            yieldRate: String(payload.yieldRate),
            startDate: payload.startDate,
            hasTax: payload.hasTax,
            accountId: payload.accountId,
          });
          
          // Handle "Debit from Balance" logic
          if (createTransaction && formData.value) {
               if (formData.accountId !== "none") {
                   const linkedAcc = accounts.find(a => a.id === formData.accountId);
                   if (linkedAcc) {
                       await createTransactionMutation.mutateAsync({
                          amount: String(Number(formData.value.replace(/\D/g, "")) / 100),
                          type: 'expense',
                          category: 'Investimento',
                          description: `Aplicação: ${finalName}`,
                          date: formData.startDate,
                          source: 'manual',
                          isPersonal: true,
                          accountId: linkedAcc.id,
                          status: 'paid'
                       });
                   }
               } else if (transactionSourceAccountId) {
                   await createTransactionMutation.mutateAsync({
                      amount: String(Number(formData.value.replace(/\D/g, "")) / 100),
                      type: 'expense',
                      category: 'Investimento',
                      description: `Aplicação: ${finalName}`,
                      date: formData.startDate,
                      source: 'manual',
                      isPersonal: true,
                    accountId: transactionSourceAccountId,
                    status: 'paid'
                 });
             }
        }
        
        toast({ title: "Investimento adicionado!" });
      }
      handleClose();
    } catch (error) {
      toast({ title: "Erro ao salvar investimento", variant: "destructive" });
    }
  };

  const handleEdit = (inv: Investment) => {
    // If linked, we should probably load the latest account balance into 'value' for display
    const linkedAccount = inv.accountId ? accounts.find(a => a.id === inv.accountId) : null;
    
    const rawValue = linkedAccount ? linkedAccount.balance : inv.value;
    const formattedValue = rawValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    setFormData({
        name: inv.name,
        value: formattedValue,
        yield: inv.yield,
        yieldRate: inv.yieldRate?.toString() || "0.85",
        startDate: inv.startDate || new Date().toISOString().split('T')[0],
        hasTax: !!inv.hasTax,
        accountId: inv.accountId || "none"
    });
    setEditingId(inv.id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ 
        name: "", 
        value: "", 
        yield: "", 
        yieldRate: "0.85", 
        startDate: new Date().toISOString().split('T')[0],
        hasTax: false,
        accountId: "none"
    });
  };

  // Projection Logic
  const projection = useMemo(() => {
    // If linked, use account balance from store (real-time) or formData value (snapshot)?
    // Let's use formData.value as it's updated on Edit open. 
    // Wait, if user changes account dropdown, we should update value.
    
    if (!formData.value || !formData.yieldRate || !formData.startDate || !projectionDate) return null;

    const start = new Date(formData.startDate);
    const end = new Date(projectionDate);
    const days = differenceInDays(end, start);
    const months = differenceInMonths(end, start); // simplified months

    if (days < 0) return null;

    const initialValue = Number(formData.value.replace(/\D/g, "")) / 100;
    const monthlyRate = Number(formData.yieldRate) / 100;
    
    // Compound Interest: M = C * (1 + i)^t
    // Using months for simplicity as yield is monthly
    const grossValue = initialValue * Math.pow(1 + monthlyRate, months + (days % 30) / 30);
    const profit = grossValue - initialValue;

    // IR Logic (Regressive Table)
    let taxRate = 0;
    if (formData.hasTax) {
        if (days <= 180) taxRate = 0.225;
        else if (days <= 360) taxRate = 0.20;
        else if (days <= 720) taxRate = 0.175;
        else taxRate = 0.15;
    }

    const taxAmount = profit > 0 ? profit * taxRate : 0;
    const netValue = grossValue - taxAmount;

    return {
        grossValue,
        profit,
        taxRate,
        taxAmount,
        netValue,
        days,
        months
    };
  }, [formData, projectionDate]);

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        <div className="flex justify-between items-center pt-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patrimônio</h1>
            <p className="text-gray-500 text-sm">Seu dinheiro rendendo</p>
          </div>
          
          <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
                    <Plus className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
                    <DialogDescription>Acompanhe e projete seus rendimentos.</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Vincular a Carteira/Conta (Opcional)</Label>
                            <Select 
                                value={formData.accountId} 
                                onValueChange={(val) => {
                                    setFormData(prev => {
                                        const account = accounts.find(a => a.id === val);
                                        return {
                                            ...prev, 
                                            accountId: val,
                                            // Auto-fill value if linking
                                            value: account ? account.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : prev.value,
                                            // Auto-fill name if empty
                                            name: (prev.name === "" && account) ? account.name : prev.name
                                        };
                                    });
                                }}
                            >
                                <SelectTrigger className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Selecione uma conta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma (Manual)</SelectItem>
                                    {accounts.filter(a => a.isPersonal).map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Ativo</Label>
                            <Input 
                                placeholder="Ex: Tesouro Direto" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                data-testid="input-investment-name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input 
                                    value={formData.value}
                                    placeholder="R$ 0,00" 
                                    onChange={(e) => setFormData({...formData, value: formatCurrencyInput(e.target.value)})}
                                    disabled={formData.accountId !== "none"}
                                    className={formData.accountId !== "none" ? "bg-gray-100 dark:bg-zinc-800 opacity-70" : "text-lg font-bold"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Rendimento (% a.m.)</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.85" 
                                    value={formData.yieldRate}
                                    onChange={(e) => setFormData({...formData, yieldRate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data de Início</Label>
                                <Input 
                                    type="date" 
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-2 mt-auto h-10">
                                <Label className="text-xs cursor-pointer" htmlFor="tax-switch">Tem IR?</Label>
                                <Switch 
                                    id="tax-switch"
                                    checked={formData.hasTax}
                                    onCheckedChange={(c) => setFormData({...formData, hasTax: c})}
                                />
                            </div>
                        </div>
                        
                        {/* Transaction Option (Only for new items) */}
                        {!editingId && (
                            <div className="bg-gray-50 dark:bg-zinc-900 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="tx-switch" className="cursor-pointer text-sm font-medium">Registrar saída do valor?</Label>
                                    <Switch 
                                        id="tx-switch"
                                        checked={createTransaction}
                                        onCheckedChange={setCreateTransaction}
                                    />
                                </div>
                                
                                {createTransaction && (
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-xs text-gray-500 mb-1.5 block">Debitar de qual conta?</Label>
                                        <Select 
                                            value={transactionSourceAccountId} 
                                            onValueChange={setTransactionSourceAccountId}
                                        >
                                            <SelectTrigger className="bg-white dark:bg-black h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-gray-500 mt-2">
                                            Isso criará uma despesa de "Investimento" na sua planilha e deduzirá o valor do saldo da conta selecionada.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Projection Simulator */}
                    {formData.value && formData.yieldRate && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calculator className="w-4 h-4 text-purple-600" />
                                <h4 className="font-bold text-sm text-purple-900 dark:text-purple-300">Projeção Futura</h4>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-xs text-purple-700 dark:text-purple-400">Simular valor em:</Label>
                                <Input 
                                    type="date" 
                                    value={projectionDate}
                                    onChange={(e) => setProjectionDate(e.target.value)}
                                    className="h-8 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-900/50"
                                />
                            </div>

                            {projection && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-gray-500">Valor Bruto</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(projection.grossValue)}</span>
                                    </div>
                                    
                                    {formData.hasTax && (
                                        <div className="flex justify-between items-end text-red-500/80">
                                            <span className="text-xs flex items-center gap-1">
                                                IR ({(projection.taxRate * 100).toFixed(1)}%)
                                                <Info className="w-3 h-3" />
                                            </span>
                                            <span className="text-xs font-medium">- {formatCurrency(projection.taxAmount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end pt-2 border-t border-purple-200 dark:border-purple-900/50">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Valor Líquido</span>
                                            <span className="text-[10px] text-purple-500">
                                                Lucro: +{formatCurrency(projection.netValue - (Number(formData.value.replace(/\D/g, "")) / 100))}
                                            </span>
                                        </div>
                                        <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                                            {formatCurrency(projection.netValue)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        {editingId && (
                            <Button 
                                variant="destructive" 
                                className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 border-none"
                                onClick={async () => {
                                    try {
                                      await deleteInvestmentMutation.mutateAsync(editingId);
                                      handleClose();
                                      toast({ title: "Investimento removido" });
                                    } catch (error) {
                                      toast({ title: "Erro ao remover", variant: "destructive" });
                                    }
                                }}
                                data-testid="button-delete-investment"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </Button>
                        )}

                        {editingId && formData.accountId === "none" && (
                          <Button
                            variant="outline"
                            className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/20"
                            onClick={async () => {
                              const inv = investments.find(i => i.id === editingId);
                              if (!inv) return;

                              const result = computeValueWithYieldToNow(inv.value, inv.yieldRate ?? 0, inv.lastYieldAppliedAt || inv.startDate);
                              if (result.profit <= 0) {
                                toast({ title: "Nada para aplicar ainda" });
                                return;
                              }

                              try {
                                await updateInvestmentMutation.mutateAsync({ id: editingId, data: {
                                  value: String(result.nextValue),
                                  lastYieldAppliedAt: new Date().toISOString()
                                }});
  
                                setFormData(prev => ({
                                  ...prev,
                                  value: result.nextValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                }));
  
                                toast({ title: "Rendimento aplicado" });
                              } catch (error) {
                                toast({ title: "Erro ao aplicar rendimento", variant: "destructive" });
                              }
                            }}
                            data-testid="button-apply-yield"
                          >
                            <Wand2 className="w-4 h-4 mr-2" /> Aplicar rendimento
                          </Button>
                        )}

                        <Button className="flex-[2] bg-purple-600 hover:bg-purple-700" onClick={handleSave} data-testid="button-save-investment">
                            <Save className="w-4 h-4 mr-2" /> Salvar
                        </Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Wealth */}
        <div className="text-center py-8 border-b border-gray-100 dark:border-zinc-800">
          <span className="text-sm font-medium text-gray-500">Total Investido</span>
          <h2 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(totalInvested)}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-green-600 bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full w-fit mx-auto">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+ {formatCurrency(totalInvested * 0.0085)} (est. 0.85%)</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-8 space-y-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Meus Ativos</h3>
          <div className="space-y-4">
            {investments.map((inv) => {
              // Determine display value: Real-time from account if linked, else stored value
              const linkedAccount = inv.accountId ? accounts.find(a => a.id === inv.accountId) : null;
              const displayValue = linkedAccount ? linkedAccount.balance : inv.value;

              return (
              <div 
                key={inv.id} 
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => handleEdit(inv)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-black rounded-xl shadow-sm relative">
                    <PieChart className="w-6 h-6 text-primary" />
                    {linkedAccount && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center" title="Vinculado à Carteira">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{inv.name}</h4>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        {inv.yield} este mês
                        {inv.hasTax && <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-zinc-800 px-1 rounded">IR</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                    <span className="font-bold text-gray-900 dark:text-white block">{formatCurrency(displayValue)}</span>
                    <span className="text-[10px] text-gray-500">
                        Início: {inv.startDate ? format(new Date(inv.startDate), 'dd/MM/yy') : '-'}
                    </span>
                </div>
              </div>
            )})}
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
             <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Dica Financeira</h4>
             <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Sua reserva de emergência está em 35%. Tente aportar mais R$ 500 este mês para atingir sua meta mais rápido.</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
