import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard as CreditCardIcon, 
  Plus, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  ShoppingBag,
  Landmark,
  ChevronRight,
  TrendingUp,
  Receipt,
  Check
} from "lucide-react";
import { useFinancialStore, CreditCard, CreditPurchase } from "@/lib/store";
import { useState, useMemo } from "react";
import { format, addMonths, setDate, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CreditCards() {
  const creditCards = useFinancialStore((state) => state.creditCards);
  const creditPurchases = useFinancialStore((state) => state.creditPurchases);
  const addCreditPurchase = useFinancialStore((state) => state.addCreditPurchase);
  const addCreditPayment = useFinancialStore((state) => state.addCreditPayment);
  const accounts = useFinancialStore((state) => state.accounts);
  
  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || "");
  const [activeTab, setActiveTab] = useState("dashboard");

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  // --- Helper Functions ---

  const getInvoiceMonthDate = (date: Date, closingDay: number) => {
    // If purchase date day >= closing day, it goes to next month
    const purchaseDay = date.getDate();
    if (purchaseDay >= closingDay) {
        return addMonths(date, 1);
    }
    return date;
  };

  const getInvoiceStatus = (card: CreditCard, month: Date) => {
    const today = new Date();
    const invoiceDate = new Date(month.getFullYear(), month.getMonth(), card.dueDay);
    
    if (isAfter(today, invoiceDate)) return 'closed'; // Actually overdue or paid
    // Ideally we check payments. For now simplified.
    return 'open';
  };

  // Calculate invoice items for a specific month/year
  const getInvoiceItems = (cardId: string, month: Date) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return [];

    const targetMonth = month.getMonth();
    const targetYear = month.getFullYear();

    let items: { purchase: CreditPurchase, installment: number, value: number, date: string }[] = [];

    creditPurchases.filter(p => p.creditCardId === cardId && p.status === 'active').forEach(purchase => {
        const pDate = new Date(purchase.purchaseDate);
        // First installment month
        let currentInstallmentMonth = getInvoiceMonthDate(pDate, card.closingDay);
        
        for (let i = 1; i <= purchase.installments; i++) {
            if (currentInstallmentMonth.getMonth() === targetMonth && currentInstallmentMonth.getFullYear() === targetYear) {
                items.push({
                    purchase,
                    installment: i,
                    value: purchase.installmentValue,
                    date: purchase.purchaseDate
                });
            }
            currentInstallmentMonth = addMonths(currentInstallmentMonth, 1);
        }
    });

    return items;
  };

  const currentInvoiceDate = useMemo(() => {
    if (!selectedCard) return new Date();
    return getInvoiceMonthDate(new Date(), selectedCard.closingDay);
  }, [selectedCard]);

  const invoiceItems = useMemo(() => {
     if (!selectedCardId) return [];
     return getInvoiceItems(selectedCardId, currentInvoiceDate);
  }, [selectedCardId, currentInvoiceDate]);

  const invoiceTotal = invoiceItems.reduce((acc, item) => acc + item.value, 0);

  const futureInvoices = useMemo(() => {
      if (!selectedCard) return [];
      const invoices = [];
      let date = addMonths(currentInvoiceDate, 1);
      for (let i = 0; i < 12; i++) { // Next 12 months
          const items = getInvoiceItems(selectedCard.id, date);
          const total = items.reduce((acc, curr) => acc + curr.value, 0);
          if (total > 0) {
              invoices.push({ date: new Date(date), total, items });
          }
          date = addMonths(date, 1);
      }
      return invoices;
  }, [selectedCard, currentInvoiceDate]);


  // Calculate Limits
  const totalLimit = selectedCard?.creditLimit || 0;
  // Used limit is sum of all remaining installments of all active purchases
  const usedLimit = useMemo(() => {
      if (!selectedCardId) return 0;
      let used = 0;
      creditPurchases.filter(p => p.creditCardId === selectedCardId && p.status === 'active').forEach(p => {
          // Calculate how many installments are paid/past
          // This is tricky without marking installments as paid.
          // Simplified: We sum all "future" installments starting from TODAY's invoice perspective?
          // Or just sum total remaining balance?
          // Let's sum ALL installments that haven't been "paid" (we don't strictly track paid invoice yet).
          // Better approach for Limit: Total Amount of purchase - Amount "cleared" by paid invoices.
          // Since we don't have paid invoices fully linked yet, let's assume limit is occupied by ALL outstanding installments
          
          // Actually, limit is released as you pay the invoice.
          // For now, let's just sum all installments that fall in current invoice or future.
          // Any installment in PAST invoices is considered "paid" for limit purposes (simplified).
          
          const pDate = new Date(p.purchaseDate);
          let itemMonth = getInvoiceMonthDate(pDate, selectedCard!.closingDay);
          
          // If itemMonth is before Current Invoice Month, it's paid (limit released).
          // If itemMonth is >= Current Invoice Month, it consumes limit.
          
          // Wait, current invoice is "Open", so it consumes limit.
          
          for (let i = 1; i <= p.installments; i++) {
               // Check if this installment is in the past (before current invoice)
               // currentInvoiceDate is the "Open" invoice.
               // If installment month < currentInvoiceDate, it's paid.
               if (!isBefore(itemMonth, new Date(currentInvoiceDate.getFullYear(), currentInvoiceDate.getMonth(), 1))) {
                   used += p.installmentValue;
               }
               itemMonth = addMonths(itemMonth, 1);
          }
      });
      return used;
  }, [selectedCardId, creditPurchases, currentInvoiceDate]);

  const availableLimit = totalLimit - usedLimit;
  const limitPercentage = (usedLimit / totalLimit) * 100;


  // --- New Purchase Form ---
  const [newPurchase, setNewPurchase] = useState({
      description: "",
      amount: "",
      installments: "1",
      category: "Outros",
      date: new Date().toISOString().split('T')[0]
  });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const handleAddPurchase = () => {
      if (!newPurchase.description || !newPurchase.amount || !selectedCardId) {
          toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
          return;
      }

      const total = Number(newPurchase.amount);
      const inst = Number(newPurchase.installments);

      addCreditPurchase({
          creditCardId: selectedCardId,
          description: newPurchase.description,
          totalAmount: total,
          installments: inst,
          installmentValue: total / inst,
          category: newPurchase.category as any,
          purchaseDate: newPurchase.date,
      });

      setNewPurchase({ description: "", amount: "", installments: "1", category: "Outros", date: new Date().toISOString().split('T')[0] });
      setIsPurchaseOpen(false);
      toast({ title: "Compra adicionada com sucesso!" });
  };

  // --- Payment Form ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
      amount: "",
      accountId: accounts.find(a => a.isPersonal)?.id || "",
      date: new Date().toISOString().split('T')[0]
  });

  const handlePayInvoice = () => {
      if (!paymentData.amount || !paymentData.accountId) {
          toast({ title: "Preencha os dados do pagamento", variant: "destructive" });
          return;
      }
      
      addCreditPayment({
          creditCardId: selectedCardId,
          amount: Number(paymentData.amount),
          accountId: paymentData.accountId,
          paymentDate: paymentData.date,
          month: currentInvoiceDate.getMonth(),
          year: currentInvoiceDate.getFullYear(),
          type: 'partial' // Simplified for now
      });

      toast({ title: "Pagamento registrado com sucesso!" });
      setIsPaymentOpen(false);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-zinc-950 pb-20">
        {/* Header with Card Selector */}
        <div className="p-6 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cartões</h1>
                <Button size="sm" variant="outline" className="h-8 gap-2">
                    <Plus className="w-4 h-4" /> Novo Cartão
                </Button>
            </div>

            {/* Card Carousel / Selector */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {creditCards.map(card => (
                    <div 
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`min-w-[280px] p-4 rounded-xl transition-all cursor-pointer border-2 ${
                            selectedCardId === card.id 
                            ? 'border-gray-900 dark:border-white shadow-lg scale-[1.02]' 
                            : 'border-transparent bg-gray-100 dark:bg-zinc-900 opacity-70'
                        } ${card.color} text-white relative overflow-hidden`}
                    >
                        <div className="flex justify-between items-start mb-8">
                            <span className="font-medium">{card.name}</span>
                            {card.brand === 'mastercard' && <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-red-500/80"></div><div className="w-6 h-6 rounded-full bg-yellow-500/80"></div></div>}
                            {card.brand === 'visa' && <span className="font-bold italic text-lg">VISA</span>}
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs opacity-80 mb-1">Limite Disponível</p>
                                <p className="font-bold text-xl">R$ {(card.creditLimit - (selectedCardId === card.id ? usedLimit : 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Fatura Atual</p>
                                <p className="font-bold">Vence dia {card.dueDay}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {selectedCard && (
            <div className="flex-1 p-6 space-y-6">
                
                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-auto py-4 flex flex-col gap-2 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800">
                                <ShoppingBag className="w-6 h-6" />
                                <span className="font-bold">Nova Compra</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Lançar Compra - {selectedCard.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>O que você comprou?</Label>
                                    <Input 
                                        placeholder="Ex: Supermercado, Uber..." 
                                        value={newPurchase.description}
                                        onChange={(e) => setNewPurchase({...newPurchase, description: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Valor Total (R$)</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0,00" 
                                            value={newPurchase.amount}
                                            onChange={(e) => setNewPurchase({...newPurchase, amount: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Parcelas</Label>
                                        <Select 
                                            value={newPurchase.installments} 
                                            onValueChange={(v) => setNewPurchase({...newPurchase, installments: v})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">À vista (1x)</SelectItem>
                                                {[2,3,4,5,6,10,12,18,24].map(i => (
                                                    <SelectItem key={i} value={String(i)}>{i}x</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Categoria</Label>
                                        <Select 
                                            value={newPurchase.category} 
                                            onValueChange={(v) => setNewPurchase({...newPurchase, category: v})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Alimentação">Alimentação</SelectItem>
                                                <SelectItem value="Transporte">Transporte</SelectItem>
                                                <SelectItem value="Lazer">Lazer</SelectItem>
                                                <SelectItem value="Moradia">Moradia</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data da Compra</Label>
                                        <Input 
                                            type="date"
                                            value={newPurchase.date}
                                            onChange={(e) => setNewPurchase({...newPurchase, date: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <Button className="w-full" onClick={handleAddPurchase}>Salvar Compra</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed border-2">
                                <Receipt className="w-6 h-6 text-gray-500" />
                                <span className="font-medium text-gray-600">Pagar Fatura</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Pagar Fatura - {selectedCard.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg text-center">
                                    <p className="text-sm text-gray-500">Valor da Fatura Atual</p>
                                    <p className="text-2xl font-bold">R$ {invoiceTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Valor do Pagamento</Label>
                                    <Input 
                                        type="number"
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                                        placeholder={invoiceTotal.toFixed(2)}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Conta de Origem</Label>
                                    <Select 
                                        value={paymentData.accountId} 
                                        onValueChange={(v) => setPaymentData({...paymentData, accountId: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Data do Pagamento</Label>
                                    <Input 
                                        type="date"
                                        value={paymentData.date}
                                        onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                                    />
                                </div>

                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handlePayInvoice}>
                                    <Check className="w-4 h-4 mr-2" /> Confirmar Pagamento
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Limit Progress */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Limite Utilizado</span>
                        <span className="font-bold">{Math.round(limitPercentage)}%</span>
                    </div>
                    <Progress value={limitPercentage} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Usado: R$ {usedLimit.toLocaleString('pt-BR')}</span>
                        <span>Total: R$ {totalLimit.toLocaleString('pt-BR')}</span>
                    </div>
                </div>

                {/* Invoice Tabs */}
                <Tabs defaultValue="current" className="w-full">
                    <TabsList className="w-full bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl mb-4">
                        <TabsTrigger value="current" className="flex-1 rounded-lg">Fatura Atual</TabsTrigger>
                        <TabsTrigger value="future" className="flex-1 rounded-lg">Futuras</TabsTrigger>
                    </TabsList>

                    <TabsContent value="current" className="space-y-4">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {format(currentInvoiceDate, 'MMMM', { locale: ptBR })}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Vence dia {selectedCard.dueDay}/{format(currentInvoiceDate, 'MM')} • Fecha dia {selectedCard.closingDay}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-gray-500 block">Total da Fatura</span>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                    R$ {invoiceTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="space-y-3">
                            {invoiceItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                                    Nenhuma compra nesta fatura
                                </div>
                            ) : (
                                invoiceItems.map((item, idx) => (
                                    <div key={`${item.purchase.id}-${idx}`} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                                                {item.purchase.category === 'Alimentação' ? '🍔' : 
                                                 item.purchase.category === 'Transporte' ? '🚗' : 
                                                 item.purchase.category === 'Lazer' ? '🍿' : '🛍️'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{item.purchase.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(item.date), 'dd/MM')} • 
                                                    {item.purchase.installments > 1 && <span className="text-blue-600 font-medium ml-1">{item.installment}/{item.purchase.installments}</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            R$ {item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="future" className="space-y-4">
                        {futureInvoices.map((inv, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold capitalize">{format(inv.date, 'MMMM yyyy', { locale: ptBR })}</h4>
                                    <span className="font-bold text-gray-900 dark:text-white">R$ {inv.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="space-y-2">
                                    {inv.items.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm text-gray-500">
                                            <span>{item.purchase.description} ({item.installment}/{item.purchase.installments})</span>
                                            <span>R$ {item.value.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {inv.items.length > 3 && (
                                        <p className="text-xs text-center text-blue-500 mt-2">+ mais {inv.items.length - 3} compras</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {futureInvoices.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Nenhuma fatura futura prevista
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        )}
      </div>
    </MobileLayout>
  );
}