import { useState } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CheckCircle2, DollarSign, Calendar, Sparkles, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { useFinancialStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { addMonths, setDate, startOfDay } from "date-fns";

export default function AddSubscription() {
  const [_, setLocation] = useLocation();
  const addSubscription = useFinancialStore((state) => state.addSubscription);
  const addCreditPurchase = useFinancialStore((state) => state.addCreditPurchase);
  const addTransaction = useFinancialStore((state) => state.addTransaction);
  const accounts = useFinancialStore((state) => state.accounts);
  const creditCards = useFinancialStore((state) => state.creditCards);
  const subscriptionCategories = useFinancialStore((state) => state.subscriptionCategories);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Streaming",
    billingDay: "",
    color: "bg-purple-600",
    isTrial: false,
    trialDays: "7",
    paymentMethod: "pix" as "credit" | "debit" | "pix" | "transfer" | "cash",
    accountId: accounts[0]?.id || "",
    creditCardId: creditCards[0]?.id || ""
  });

  const popularServices = [
    { name: "Netflix", color: "bg-black", category: "Streaming" },
    { name: "Spotify", color: "bg-green-500", category: "Música" },
    { name: "Amazon Prime", color: "bg-blue-500", category: "Shopping" },
    { name: "Youtube Premium", color: "bg-red-600", category: "Streaming" },
    { name: "iCloud", color: "bg-blue-400", category: "Software" },
  ];

  const handleSave = () => {
    if (!formData.name || !formData.price || (!formData.billingDay && !formData.isTrial)) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    if (formData.paymentMethod === 'credit' && !formData.creditCardId) {
        toast({ title: "Selecione o cartão", variant: "destructive" });
        return;
    }

    if (formData.paymentMethod !== 'credit' && !formData.accountId) {
        toast({ title: "Selecione a conta/carteira", variant: "destructive" });
        return;
    }
    
    const price = Number(formData.price);
    const billingDay = Math.max(1, Math.min(31, Number(formData.isTrial ? formData.trialDays : formData.billingDay)));

    // Subscriptions are ALWAYS recurring until cancelled.
    // Behavior:
    // - credit: generate monthly 1x purchases on the card (no installment plan)
    // - non-credit: generate monthly pending expense transactions (projections)
    addSubscription({
        name: formData.name,
        price: price,
        date: formData.isTrial ? "" : String(billingDay),
        logo: "",
        color: formData.color,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        accountId: formData.paymentMethod === 'credit' ? undefined : formData.accountId,
        creditCardId: formData.paymentMethod === 'credit' ? formData.creditCardId : undefined,
        usage: "medium",
        usageLabel: "Uso Normal",
        isTrial: formData.isTrial,
        trialDays: formData.isTrial ? Number(formData.trialDays) : undefined,
        futurePrice: formData.isTrial ? price : undefined
    });

    if (!formData.isTrial) {
        const start = startOfDay(new Date());
        const day = Math.max(1, Math.min(31, billingDay || 1));
        const firstOccurrence = (() => {
            const thisMonth = setDate(start, day);
            if (thisMonth >= start) return thisMonth;
            return setDate(addMonths(start, 1), day);
        })();

        const now = new Date();
        const cardForPosting = creditCards.find(c => c.id === formData.creditCardId);
        const isCardCycleStillOpen = (() => {
            if (!cardForPosting) return false;
            const closesNextMonth = cardForPosting.closingDay <= now.getDate();
            // Same rule used on credit-cards page: if cycle closes next month, current open invoice is "this month"
            return !closesNextMonth;
        })();

        const isSameMonthAndYear = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

        for (let i = 0; i < 12; i++) {
            const occurrence = addMonths(firstOccurrence, i);
            // Store as local YYYY-MM-DD so date-fns parseISO won't shift days by timezone
            const ymd = `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}-${String(occurrence.getDate()).padStart(2, '0')}`;

            // If the charge is due in the current month AND the card cycle hasn't closed yet, it must enter the CURRENT invoice month.
            // To do that, we post it as "today" (midday) so it stays within the open cycle.
            const iso = (i === 0 && isSameMonthAndYear(occurrence, start) && isCardCycleStillOpen)
                ? new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00`).toISOString()
                : ymd;

            if (formData.paymentMethod === 'credit') {
                addCreditPurchase({
                    creditCardId: formData.creditCardId,
                    description: `${formData.name} (Assinatura)`,
                    totalAmount: price,
                    installments: 1,
                    installmentValue: price,
                    category: 'Outros' as any,
                    purchaseDate: iso,
                });
            } else {
                addTransaction({
                    amount: price,
                    type: 'expense',
                    category: 'Outros' as any,
                    description: `${formData.name} (Assinatura)`,
                    date: iso,
                    source: 'manual',
                    isPersonal: true,
                    status: 'pending',
                    accountId: formData.accountId,
                    paymentMethod: formData.paymentMethod,
                });
            }
        }

        toast({
            title: "Assinatura adicionada e projetada!",
            description: "J\u00e1 lancei automaticamente os pr\u00f3ximos 12 meses nas faturas/proje\u00e7\u00f5es (sem parcelamento).",
        });
    } else {
        toast({
            title: "Sentinela Ativado!",
            description: `${formData.name} foi adicionado como teste gr\u00e1tis.`,
        });
    }

    setLocation("/subscriptions");
  };

  const handleServiceSelect = (service: typeof popularServices[0]) => {
      setFormData({
          ...formData,
          name: service.name,
          color: service.color,
          category: service.category
      });
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black">
        
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 sticky top-0 z-10">
            <Link href="/subscriptions">
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nova Assinatura</h1>
        </div>

        <div className="flex-1 p-6 space-y-8">
            
            {/* Quick Select */}
            <div className="space-y-3">
                <Label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Populares</Label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {popularServices.map((service, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleServiceSelect(service)}
                            className={`flex flex-col items-center gap-2 min-w-[70px] transition-transform active:scale-95 ${formData.name === service.name ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl ${service.color} shadow-md flex items-center justify-center text-white font-bold text-lg`}>
                                {service.name[0]}
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{service.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Form */}
            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                
                <div className="space-y-2">
                    <Label>Nome do Serviço</Label>
                    <Input 
                        placeholder="Ex: Disney+" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl"
                    />
                </div>

                {/* Free Trial Toggle */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="space-y-0.5">
                        <Label className="text-base">Período de Teste?</Label>
                        <p className="text-xs text-gray-500">Ativar o Sentinela para alertar antes da cobrança</p>
                    </div>
                    <Switch 
                        checked={formData.isTrial}
                        onCheckedChange={(checked) => setFormData({...formData, isTrial: checked})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Valor Mensal</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                                data-testid="input-subscription-price"
                                type="number"
                                placeholder="0,00" 
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                className="pl-9 bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl font-bold"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>{formData.isTrial ? 'Dias de Teste' : 'Dia Cobrança'}</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                                data-testid="input-subscription-billingday"
                                type="number"
                                min="1"
                                max={formData.isTrial ? "365" : "31"}
                                placeholder={formData.isTrial ? "7" : "Dia"} 
                                value={formData.isTrial ? formData.trialDays : formData.billingDay}
                                onChange={(e) => setFormData({
                                    ...formData, 
                                    [formData.isTrial ? 'trialDays' : 'billingDay']: e.target.value
                                })}
                                className="pl-9 bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Como será pago?</Label>
                    <Select value={formData.paymentMethod} onValueChange={(val: any) => setFormData({...formData, paymentMethod: val})}>
                        <SelectTrigger data-testid="select-subscription-paymentmethod" className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="credit">Cartão (compra mensal 1x)</SelectItem>
                            <SelectItem value="pix">Pix (mensal)</SelectItem>
                            <SelectItem value="debit">Débito (mensal)</SelectItem>
                            <SelectItem value="transfer">Transferência (mensal)</SelectItem>
                            <SelectItem value="cash">Dinheiro (mensal)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-500">
                        A assinatura \u00e9 recorrente e fica projetada todo m\u00eas at\u00e9 voc\u00ea cancelar (n\u00e3o \u00e9 parcelamento).
                    </p>
                </div>

                {formData.paymentMethod === 'credit' ? (
                    <div className="space-y-2">
                        <Label>Cartão</Label>
                        <Select value={formData.creditCardId} onValueChange={(val) => setFormData({...formData, creditCardId: val})}>
                            <SelectTrigger data-testid="select-subscription-card" className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl">
                                <SelectValue placeholder={creditCards.length ? "Selecione o cartão" : "Nenhum cartão cadastrado"} />
                            </SelectTrigger>
                            <SelectContent>
                                {creditCards.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!creditCards.length && (
                            <p className="text-[11px] text-gray-500">Cadastre um cartão em “Cartões” para usar aqui.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label>Conta / Carteira</Label>
                        <Select value={formData.accountId} onValueChange={(val) => setFormData({...formData, accountId: val})}>
                            <SelectTrigger data-testid="select-subscription-account" className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl">
                                <SelectValue placeholder={accounts.length ? "Selecione" : "Nenhuma conta cadastrada"} />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                        <SelectTrigger data-testid="select-subscription-category" className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 h-12 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {subscriptionCategories.map((cat) => (
                              <SelectItem key={cat} value={cat} data-testid={`option-subscription-category-${cat}`}>
                                {cat}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* AI Prediction (Mock) */}
            {formData.name && (
                <div className={`p-4 rounded-2xl border flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                    formData.isTrial 
                    ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30" 
                    : "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30"
                }`}>
                    {formData.isTrial ? (
                         <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    ) : (
                         <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    )}
                    
                    <div>
                        <h4 className={`font-bold text-sm ${
                            formData.isTrial ? "text-yellow-700 dark:text-yellow-400" : "text-indigo-700 dark:text-indigo-300"
                        }`}>
                            {formData.isTrial ? "Sentinela Ativado" : "Estimativa Anual"}
                        </h4>
                        <p className={`text-xs mt-1 ${
                            formData.isTrial ? "text-yellow-700/80 dark:text-yellow-400/80" : "text-indigo-600/80 dark:text-indigo-400/80"
                        }`}>
                            {formData.isTrial 
                                ? "Nós vamos te avisar antes do período de teste acabar para você não ser cobrado acidentalmente."
                                : <span>Este serviço custará aproximadamente <span className="font-bold">{formatCurrency(Number(formData.price) * 12)}</span> por ano.</span>
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 sticky bottom-0">
            <Button 
                className="w-full h-14 text-base font-bold bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-lg shadow-purple-200 dark:shadow-none"
                onClick={handleSave}
            >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Salvar Assinatura
            </Button>
        </div>

      </div>
    </MobileLayout>
  );
}
