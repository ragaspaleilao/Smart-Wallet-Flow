import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard as CreditCardIcon, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useFinancialStore, Category } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManualEntry() {
  const [_, setLocation] = useLocation();
  const { addTransaction, addCreditPurchase, accounts, creditCards } = useFinancialStore();
  
  const [type, setType] = useState<"expense" | "income">("expense");
  const [paymentMethod, setPaymentMethod] = useState<"debit" | "credit">("debit");
  
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Alimentação");
  
  // Account / Card Selection
  const [accountId, setAccountId] = useState<string>("");
  const [cardId, setCardId] = useState<string>("");

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
    if (creditCards.length > 0 && !cardId) setCardId(creditCards[0].id);
  }, [accounts, creditCards]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  // Repetition / Projection State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'installments' | 'fixed'>('installments'); // installments (parcelado) vs fixed (recorrente)
  const [installments, setInstallments] = useState(2);
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'yearly'>('monthly');
  const [occurrences, setOccurrences] = useState(12);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const formatCurrency = (val: string) => {
    // Remove all non-numeric characters
    const number = val.replace(/\D/g, "");
    
    if (!number) return "";
    
    // Convert to value (cents)
    const value = Number(number) / 100;
    
    // Format using BRL currency style
    return value.toLocaleString("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrency(e.target.value));
  };

  const handleSave = () => {
    // Parse amount from formatted string (e.g., "R$ 1.234,56")
    const numericAmount = Number(amount.replace(/[^0-9,]/g, "").replace(",", ".")) / 100;

    if (!numericAmount || numericAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!description) {
       toast({
        title: "Descrição obrigatória",
        description: "Por favor, informe uma descrição.",
        variant: "destructive",
      });
      return;
    }

    // CREDIT CARD LOGIC
    if (paymentMethod === 'credit') {
        if (!cardId) {
            toast({
                title: "Cartão obrigatório",
                description: "Selecione o cartão de crédito utilizado.",
                variant: "destructive",
            });
            return;
        }

        // Credit purchases are always expenses (for now)
        if (type === 'income') {
            toast({
                title: "Operação inválida",
                description: "Não é possível adicionar receita em cartão de crédito.",
                variant: "destructive",
            });
            return;
        }

        const numInstallments = (isRecurring && recurrenceType === 'installments') ? installments : 1;
        const purchaseDate = date; // Transaction date

        addCreditPurchase({
            creditCardId: cardId,
            purchaseDate: purchaseDate,
            totalAmount: numericAmount,
            installments: numInstallments,
            installmentValue: numericAmount / numInstallments,
            category,
            description,
        });

        toast({
            title: "Compra no Crédito salva!",
            description: `${description} - ${numInstallments}x de ${(numericAmount / numInstallments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        });

        setLocation("/dashboard");
        return;
    }
    
    // DEBIT / ACCOUNT LOGIC
    if (!accountId) {
       toast({
        title: "Conta obrigatória",
        description: "Selecione de onde saiu ou para onde foi o dinheiro.",
        variant: "destructive",
      });
      return;
    }

    if (isRecurring) {
        const baseDate = new Date(startDate);
        
        if (recurrenceType === 'installments') {
            // Installments Logic (Total Amount / N)
            const installmentValue = numericAmount / installments;
            
            for (let i = 0; i < installments; i++) {
                const newDate = new Date(baseDate);
                newDate.setMonth(baseDate.getMonth() + i);
                
                addTransaction({
                    amount: installmentValue,
                    type,
                    category,
                    description: `${description} (${i + 1}/${installments})`,
                    source: "manual",
                    isPersonal: true,
                    accountId,
                    // First installment follows selected status, others are pending usually? 
                    // For simplicity, let's keep selected status for first, and pending for future.
                    status: i === 0 ? status : 'pending',
                    date: newDate.toISOString()
                });
            }
             toast({
                title: "Parcelamento gerado!",
                description: `${installments} parcelas de R$ ${installmentValue.toFixed(2)} criadas.`,
            });

        } else {
            // Fixed/Recurring Logic (Amount * N)
            // e.g. Salary, Subscription
            const count = occurrences;
            
            for (let i = 0; i < count; i++) {
                const newDate = new Date(baseDate);
                
                if (frequency === 'monthly') newDate.setMonth(baseDate.getMonth() + i);
                else if (frequency === 'yearly') newDate.setFullYear(baseDate.getFullYear() + i);
                else if (frequency === 'biweekly') newDate.setDate(baseDate.getDate() + (i * 14));
                
                addTransaction({
                    amount: numericAmount, // Recurring keeps same value
                    type,
                    category,
                    description: `${description} (${i + 1}/${count})`, // Optional counter
                    source: "manual",
                    isPersonal: true,
                    accountId,
                    status: i === 0 ? status : 'pending', // Future ones pending
                    date: newDate.toISOString()
                });
            }
             toast({
                title: "Recorrência gerada!",
                description: `${count} lançamentos de R$ ${numericAmount.toFixed(2)} criados.`,
            });
        }
    } else {
        // Single Transaction
        addTransaction({
            amount: numericAmount,
            type,
            category,
            description,
            source: "manual",
            isPersonal: true,
            accountId,
            status,
            date // Add date here
        });

        toast({
            title: "Salvo com sucesso!",
            description: `${type === "expense" ? "Despesa" : "Receita"} de R$ ${numericAmount.toFixed(2)} registrada.`,
        });
    }

    setLocation("/dashboard");
  };

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col p-6 bg-white dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">Novo Lançamento</h1>
          <div className="w-10" />
        </div>

        {/* Payment Method Switcher (Debit vs Credit) */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 dark:bg-zinc-900 rounded-xl">
            <button
                onClick={() => setPaymentMethod('debit')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                    paymentMethod === 'debit' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
                <Wallet className="w-4 h-4" />
                Conta / Débito
            </button>
            <button
                onClick={() => {
                    setPaymentMethod('credit');
                    setType('expense'); // Force expense for credit
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                    paymentMethod === 'credit' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
            >
                <CreditCardIcon className="w-4 h-4" />
                Crédito
            </button>
        </div>

        {/* Type Switcher (Only visible for Debit, or forced Expense for Credit) */}
        {paymentMethod === 'debit' && (
            <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-8">
            <button
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                type === "expense"
                    ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                onClick={() => setType("expense")}
            >
                Despesa
            </button>
            <button
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
                type === "income"
                    ? "bg-white dark:bg-zinc-700 text-green-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                onClick={() => setType("income")}
            >
                Receita
            </button>
            </div>
        )}

        {/* Amount Input */}
        <div className="mb-8">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Valor</Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              className={`text-4xl font-bold h-20 border-none px-0 shadow-none focus-visible:ring-0 ${
                type === 'expense' || paymentMethod === 'credit' ? 'text-red-600 placeholder:text-red-200' : 'text-green-600 placeholder:text-green-200'
              }`}
              value={amount}
              onChange={handleAmountChange}
              autoFocus
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Almoço, Uber, Salário" 
              className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          {/* Account OR Credit Card Selection */}
          <div className="space-y-2">
            <Label>{paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Conta / Carteira'}</Label>
            
            {paymentMethod === 'credit' ? (
                 <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                        <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                        {creditCards.length > 0 ? (
                            creditCards.map(card => (
                                <SelectItem key={card.id} value={card.id}>
                                    {card.name} (Dia {card.closingDay})
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>Nenhum cartão cadastrado</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            ) : (
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                        <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString('pt-BR')})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Salário", "Vendas", "Serviços", "Outros"].map((cat) => (
                <button 
                  key={cat} 
                  className={`px-4 py-2 border rounded-full text-sm whitespace-nowrap transition-colors ${
                    category === cat 
                      ? "bg-primary text-white border-primary" 
                      : "bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-primary hover:text-primary"
                  }`}
                  onClick={() => setCategory(cat as Category)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <div className="flex gap-2">
                <Input 
                  type="date" 
                  className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 flex-1" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                
                {/* Status Toggle - Only for Debit */}
                {paymentMethod === 'debit' && (
                    <div className="flex bg-gray-50 dark:bg-zinc-900 rounded-md border border-gray-200 dark:border-zinc-800 p-1">
                        <button
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500'}`}
                            onClick={() => setStatus('paid')}
                        >
                            Pago
                        </button>
                        <button
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-gray-500'}`}
                            onClick={() => setStatus('pending')}
                        >
                            Pendente
                        </button>
                    </div>
                )}
            </div>
          </div>

          {/* Recurrence / Projection Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Repetição / Parcelamento</Label>
                <Switch 
                    checked={isRecurring} 
                    onCheckedChange={setIsRecurring}
                />
            </div>

            {isRecurring && (
                <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Only show Start Date for Debit Recurring, for Credit Card it uses purchase date */}
                    {paymentMethod === 'debit' && (
                        <div className="space-y-2">
                            <Label>Data de Início (1ª Parcela/Cobrança)</Label>
                            <Input 
                            type="date" 
                            className="h-12 bg-white dark:bg-black border-gray-200 dark:border-zinc-800" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    )}

                    <Tabs value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)} className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="installments">Parcelado</TabsTrigger>
                            {paymentMethod === 'debit' && (
                                <TabsTrigger value="fixed">Fixo / Recorrente</TabsTrigger>
                            )}
                        </TabsList>
                        
                        <TabsContent value="installments" className="pt-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Número de Parcelas</Label>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" size="icon" 
                                        onClick={() => setInstallments(Math.max(2, installments - 1))}
                                        className="h-12 w-12"
                                    >
                                        -
                                    </Button>
                                    <div className="flex-1 h-12 flex items-center justify-center bg-white dark:bg-black border rounded-md font-bold text-lg">
                                        {installments}x
                                    </div>
                                    <Button 
                                        variant="outline" size="icon" 
                                        onClick={() => setInstallments(Math.min(120, installments + 1))}
                                        className="h-12 w-12"
                                    >
                                        +
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    Serão gerados {installments} lançamentos mensais.
                                    <br/>
                                    Valor da parcela: <strong>{(Number(amount.replace(/[^0-9,]/g, "").replace(",", ".")) / 100 / installments).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="fixed" className="pt-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Frequência</Label>
                                <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                                    <SelectTrigger className="h-12 bg-white dark:bg-black">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensal</SelectItem>
                                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                                        <SelectItem value="yearly">Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Repetir por quantas vezes?</Label>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" size="icon" 
                                        onClick={() => setOccurrences(Math.max(2, occurrences - 1))}
                                        className="h-12 w-12"
                                    >
                                        -
                                    </Button>
                                    <div className="flex-1 h-12 flex items-center justify-center bg-white dark:bg-black border rounded-md font-bold text-lg">
                                        {occurrences}x
                                    </div>
                                    <Button 
                                        variant="outline" size="icon" 
                                        onClick={() => setOccurrences(Math.min(60, occurrences + 1))}
                                        className="h-12 w-12"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6">
          <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
