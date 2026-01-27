import { Link } from "wouter";
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
  Check,
  BarChart2,
  Mic,
  Camera,
  Bell
} from "lucide-react";
import { useFinancialStore, CreditCard, CreditPurchase } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import { format, addMonths, setDate, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CreditCards() {
  const creditCards = useFinancialStore((state) => state.creditCards);
  const creditPurchases = useFinancialStore((state) => state.creditPurchases);
  const addCreditPurchase = useFinancialStore((state) => state.addCreditPurchase);
  const addCreditPayment = useFinancialStore((state) => state.addCreditPayment);
  const accounts = useFinancialStore((state) => state.accounts);
  
  const addCreditCard = useFinancialStore((state) => state.addCreditCard);

  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || "");
  const [activeTab, setActiveTab] = useState("current");
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardData, setNewCardData] = useState({
    name: "",
    brand: "mastercard",
    creditLimit: "",
    closingDay: "",
    dueDay: "",
    color: "bg-black"
  });

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  const formatCurrencyInput = (val: string) => {
    const number = val.replace(/\D/g, "");
    return (Number(number) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleAddCard = () => {
    if (!newCardData.name || !newCardData.creditLimit || !newCardData.closingDay || !newCardData.dueDay) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    const numericLimit = Number(newCardData.creditLimit.replace(/\D/g, "")) / 100;

    addCreditCard({
        name: newCardData.name,
        brand: newCardData.brand as any,
        creditLimit: numericLimit,
        closingDay: Number(newCardData.closingDay),
        dueDay: Number(newCardData.dueDay),
        color: newCardData.color,
    });

    setNewCardData({
        name: "",
        brand: "mastercard",
        creditLimit: "",
        closingDay: "",
        dueDay: "",
        color: "bg-black"
    });
    setIsAddCardOpen(false);
    toast({ title: "Cartão adicionado com sucesso!" });
  };

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


  // --- Total Projection Calculation (All Cards) ---
  const totalProjection = useMemo(() => {
      const projection = [];
      // Start from next month relative to TODAY, to show future commitments
      // Or start from current month? Let's start from current month (to show immediate commitment) + 11 months
      
      let date = new Date();
      // Normalize to 1st of month to align
      date.setDate(1);

      for (let i = 0; i < 12; i++) {
          let monthTotal = 0;
          
          creditCards.forEach(card => {
               // Determine the invoice date for THIS card for the target 'date'
               // Actually we need to find what invoice corresponds to 'date' month/year
               // For simplicity, let's just use getInvoiceItems for that month
               const items = getInvoiceItems(card.id, date);
               monthTotal += items.reduce((a, b) => a + b.value, 0);
          });

          projection.push({
              name: format(date, 'MMM', { locale: ptBR }),
              fullDate: format(date, 'MMMM yyyy', { locale: ptBR }),
              total: monthTotal,
              month: date.getMonth()
          });
          
          date = addMonths(date, 1);
      }
      return projection;
  }, [creditCards, creditPurchases]);


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

      const total = Number(newPurchase.amount.replace(/\D/g, "")) / 100;
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
      
      const numericAmount = Number(paymentData.amount.replace(/\D/g, "")) / 100;

      addCreditPayment({
          creditCardId: selectedCardId,
          amount: numericAmount,
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
                <Dialog open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
                    <DialogTrigger asChild>
                         <Button size="sm" variant="ghost" className="h-8 gap-2 text-primary font-bold bg-primary/10 hover:bg-primary/20">
                            <BarChart2 className="w-4 h-4" /> Projeção Geral
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Comprometimento Mensal</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-gray-500 mb-4">Total de faturas (todos os cartões) para os próximos 12 meses.</p>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={totalProjection}>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-zinc-800">
                                                        <p className="font-bold text-sm">{payload[0].payload.fullDate}</p>
                                                        <p className="text-primary font-bold">{formatCurrency(Number(payload[0].value))}</p>
                                                    </div>
                                                );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                {totalProjection.filter(p => p.total > 0).map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                                        <span className="font-medium">{p.fullDate}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(p.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
               
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
                            {card.brand === 'elo' && <span className="font-bold text-lg">elo</span>}
                            {card.brand === 'amex' && <span className="font-bold text-lg tracking-tighter">AMEX</span>}
                            {card.brand === 'hipercard' && <span className="font-bold italic text-lg">Hiper</span>}
                            {card.brand === 'other' && <CreditCardIcon className="w-6 h-6" />}
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs opacity-80 mb-1">Limite Disponível</p>
                                <p className="font-bold text-xl">{formatCurrency(card.creditLimit - (selectedCardId === card.id ? usedLimit : 0))}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Fatura Atual</p>
                                <p className="font-bold">Vence dia {card.dueDay}</p>
                            </div>
                        </div>
                    </div>
                ))}
                 
                 <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="min-w-[50px] h-[140px] rounded-xl border-dashed border-2 flex flex-col gap-2 items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-900">
                            <Plus className="w-8 h-8 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">Novo</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Cartão</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Cartão</Label>
                                <Input 
                                    placeholder="Ex: Nubank Platinum" 
                                    value={newCardData.name}
                                    onChange={(e) => setNewCardData({...newCardData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bandeira</Label>
                                <Select 
                                    value={newCardData.brand} 
                                    onValueChange={(v) => setNewCardData({...newCardData, brand: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mastercard">Mastercard</SelectItem>
                                        <SelectItem value="visa">Visa</SelectItem>
                                        <SelectItem value="elo">Elo</SelectItem>
                                        <SelectItem value="amex">American Express</SelectItem>
                                        <SelectItem value="hipercard">Hipercard</SelectItem>
                                        <SelectItem value="other">Outra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Limite de Crédito</Label>
                                <Input 
                                    value={newCardData.creditLimit}
                                    placeholder="R$ 0,00"
                                    onChange={(e) => setNewCardData({...newCardData, creditLimit: formatCurrencyInput(e.target.value)})}
                                    className="text-lg font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dia Fechamento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={newCardData.closingDay}
                                        onChange={(e) => setNewCardData({...newCardData, closingDay: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dia Vencimento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={newCardData.dueDay}
                                        onChange={(e) => setNewCardData({...newCardData, dueDay: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cor do Cartão</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {['bg-black', 'bg-purple-600', 'bg-blue-600', 'bg-red-600', 'bg-green-600', 'bg-orange-500', 'bg-yellow-500', 'bg-pink-600', 'bg-indigo-600', 'bg-gray-600'].map(color => (
                                        <div 
                                            key={color}
                                            className={`w-8 h-8 rounded-full cursor-pointer ${color} ${newCardData.color === color ? 'ring-2 ring-offset-2 ring-black dark:ring-white' : ''}`}
                                            onClick={() => setNewCardData({...newCardData, color})}
                                        />
                                    ))}
                                </div>
                            </div>
                            <Button className="w-full mt-2" onClick={handleAddCard}>Criar Cartão</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        {selectedCard && (
            <div className="flex-1 p-6 space-y-6">
                
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <Link href="/photo-entry">
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1">
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Recibo</span>
                    </Button>
                  </Link>
                  
                  <Link href="/voice-entry">
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1">
                      <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                        <Mic className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Voz</span>
                    </Button>
                  </Link>

                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1" onClick={() => toast({title: "Leitura de notificação em breve"})}>
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Notif.</span>
                  </Button>

                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group p-1" onClick={() => setIsPurchaseOpen(true)}>
                      <div className="p-2.5 bg-primary text-white rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-primary">Manual</span>
                  </Button>
                </div>

                {/* Main Actions */}
                <div className="grid grid-cols-1 gap-3">
                    <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
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
                                        <Label>Valor Total</Label>
                                        <Input 
                                            value={newPurchase.amount}
                                            placeholder="R$ 0,00"
                                            onChange={(e) => setNewPurchase({...newPurchase, amount: formatCurrencyInput(e.target.value)})}
                                            className="text-lg font-bold"
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
                                    <p className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Valor do Pagamento</Label>
                                    <Input 
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({...paymentData, amount: formatCurrencyInput(e.target.value)})}
                                        placeholder={formatCurrency(invoiceTotal)}
                                        className="text-lg font-bold"
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
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</SelectItem>
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
                        <span>Usado: {formatCurrency(usedLimit)}</span>
                        <span>Total: {formatCurrency(totalLimit)}</span>
                    </div>
                </div>

                {/* Invoice Tabs */}
                <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                                    {formatCurrency(invoiceTotal)}
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
                                                 item.purchase.category === 'Transporte' ? '🚗' : '🛍️'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{item.purchase.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(item.purchase.purchaseDate), 'dd/MM')} • Parcela {item.installment}/{item.purchase.installments}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(item.value)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="future" className="space-y-4">
                        {futureInvoices.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                Nenhuma fatura futura prevista.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {futureInvoices.map((inv, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                                <span className="font-bold capitalize">{format(inv.date, 'MMMM yyyy', { locale: ptBR })}</span>
                                            </div>
                                            <span className="font-bold text-lg">{formatCurrency(inv.total)}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {inv.items.map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                    <span>{item.purchase.description} ({item.installment}/{item.purchase.installments})</span>
                                                    <span>{formatCurrency(item.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
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