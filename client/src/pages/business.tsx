import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Category, TransactionType, AccountType } from "@/lib/store";
import { calculateBusinessMetrics, generateBusinessInsights } from "@/lib/business-ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, Package, DollarSign, BarChart3, Plus, Settings2, Trash2, Edit2, Wallet, ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { Sparkles, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nanoid } from "nanoid";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Business() {
  const { businessProducts, businessSettings, addBusinessProduct, updateBusinessSettings, addTransaction, accounts, transactions, addAccount } = useFinancialStore();
  
  // Ensure business accounts exist (for users with old data)
  useEffect(() => {
    const hasBusinessAccounts = accounts.some(a => !a.isPersonal);
    if (!hasBusinessAccounts) {
        addAccount({ name: 'Caixa Empresa', type: 'cash', balance: 500.00, initialBalance: 0, color: 'bg-blue-600', isPersonal: false });
        addAccount({ name: 'Banco PJ', type: 'bank', balance: 2500.00, initialBalance: 0, color: 'bg-indigo-600', isPersonal: false });
        toast({ title: "Contas empresariais criadas!" });
    }
  }, [accounts, addAccount]);

  // Filter only business related accounts and transactions
  const businessAccounts = accounts.filter(a => !a.isPersonal);
  const businessTransactions = useMemo(() => transactions.filter(t => !t.isPersonal), [transactions]);

  const metrics = useMemo(() => calculateBusinessMetrics(businessProducts, businessSettings), [businessProducts, businessSettings]);
  const insights = useMemo(() => generateBusinessInsights(metrics), [metrics]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    sellingPrice: "",
    averageMonthlySales: "",
    directCosts: [] as { id: string, name: string, value: number }[]
  });
  
  const [newCostName, setNewCostName] = useState("");
  const [newCostValue, setNewCostValue] = useState("");

  // Daily Entry State
  const [dailyEntryOpen, setDailyEntryOpen] = useState(false);
  const [dailyEntry, setDailyEntry] = useState({
    type: 'income' as TransactionType,
    description: "",
    amount: "",
    category: "Vendas" as Category,
    accountId: ""
  });

  // Transfer State
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    amount: "",
    fromAccountId: "",
    toAccountId: "",
    description: "Pro-labore"
  });

  const handleTransfer = () => {
    if (!transferData.amount || !transferData.fromAccountId || !transferData.toAccountId) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    // 1. Withdraw from Business Account
    addTransaction({
        type: 'expense',
        amount: Number(transferData.amount),
        description: `Transferência para Pessoal: ${transferData.description}`,
        category: 'Outros', // Or specific category for transfers
        source: 'manual',
        isPersonal: false,
        accountId: transferData.fromAccountId
    });

    // 2. Deposit into Personal Account
    addTransaction({
        type: 'income',
        amount: Number(transferData.amount),
        description: `Recebido da Empresa: ${transferData.description}`,
        category: 'Salário', // Or specific category
        source: 'manual',
        isPersonal: true,
        accountId: transferData.toAccountId
    });

    setTransferOpen(false);
    setTransferData({ amount: "", fromAccountId: "", toAccountId: "", description: "Pro-labore" });
    toast({ title: "Transferência realizada com sucesso!" });
  };

  const handleAddCost = () => {
    if (newCostName && newCostValue) {
        setNewProduct(prev => ({
            ...prev,
            directCosts: [...prev.directCosts, { id: nanoid(), name: newCostName, value: Number(newCostValue) }]
        }));
        setNewCostName("");
        setNewCostValue("");
    }
  };

  const handleSaveProduct = () => {
    addBusinessProduct({
        name: newProduct.name,
        category: newProduct.category || "Geral",
        sellingPrice: Number(newProduct.sellingPrice),
        averageMonthlySales: Number(newProduct.averageMonthlySales),
        directCosts: newProduct.directCosts
    });
    setNewProduct({ name: "", category: "", sellingPrice: "", averageMonthlySales: "", directCosts: [] });
    toast({ title: "Produto adicionado!" });
  };

  const handleSaveDailyEntry = () => {
    if (!dailyEntry.description || !dailyEntry.amount || !dailyEntry.accountId) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    addTransaction({
        type: dailyEntry.type,
        amount: Number(dailyEntry.amount),
        description: dailyEntry.description,
        category: dailyEntry.category,
        source: 'manual',
        isPersonal: false, // Business Transaction
        accountId: dailyEntry.accountId
    });

    setDailyEntryOpen(false);
    setDailyEntry({ type: 'income', description: "", amount: "", category: "Vendas", accountId: "" });
    toast({ title: "Lançamento registrado!" });
  };

  const chartData = metrics.calculatedProducts.map(p => ({
    name: p.name,
    lucro: p.monthlyProfit,
    receita: p.sellingPrice * p.averageMonthlySales
  }));

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 pb-2 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="-ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" />
                        Meu Negócio
                    </h1>
                    <p className="text-xs text-gray-500">Gestão para MEI e Autônomos</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {/* Transfer Button (Pro-labore) */}
                <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" variant="outline" className="rounded-full border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100">
                            <ArrowRightLeft className="w-5 h-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Transferir para Pessoal (Pro-labore)</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label>Valor a Transferir</Label>
                                <Input 
                                    type="number" 
                                    value={transferData.amount} 
                                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="text-lg font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Conta de Origem (Empresa)</Label>
                                <Select value={transferData.fromAccountId} onValueChange={(val) => setTransferData({...transferData, fromAccountId: val})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione conta da empresa..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {businessAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Conta de Destino (Pessoal)</Label>
                                <Select value={transferData.toAccountId} onValueChange={(val) => setTransferData({...transferData, toAccountId: val})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione conta pessoal..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.filter(a => a.isPersonal).map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                             <div className="space-y-2">
                                <Label>Descrição / Motivo</Label>
                                <Input 
                                    value={transferData.description} 
                                    onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                                    placeholder="Ex: Pro-labore Janeiro"
                                />
                            </div>

                            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleTransfer}>
                                Confirmar Transferência
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Daily Entry Button */}
                <Dialog open={dailyEntryOpen} onOpenChange={setDailyEntryOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100">
                            <DollarSign className="w-5 h-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Lançamento Diário</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${dailyEntry.type === 'income' ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600' : 'text-gray-500'}`}
                                    onClick={() => setDailyEntry({...dailyEntry, type: 'income', category: 'Vendas'})}
                                >
                                    Venda / Receita
                                </button>
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${dailyEntry.type === 'expense' ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600' : 'text-gray-500'}`}
                                    onClick={() => setDailyEntry({...dailyEntry, type: 'expense', category: 'Outros'})}
                                >
                                    Despesa
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label>Valor</Label>
                                <Input 
                                    type="number" 
                                    value={dailyEntry.amount} 
                                    onChange={(e) => setDailyEntry({...dailyEntry, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="text-lg font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input 
                                    value={dailyEntry.description} 
                                    onChange={(e) => setDailyEntry({...dailyEntry, description: e.target.value})}
                                    placeholder={dailyEntry.type === 'income' ? "Ex: Venda do dia" : "Ex: Compra de material"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select value={dailyEntry.category} onValueChange={(val: Category) => setDailyEntry({...dailyEntry, category: val})}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dailyEntry.type === 'income' ? (
                                            <>
                                                <SelectItem value="Vendas">Vendas</SelectItem>
                                                <SelectItem value="Serviços">Serviços</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="Alimentação">Insumos (Alimentação)</SelectItem>
                                                <SelectItem value="Transporte">Transporte / Entrega</SelectItem>
                                                <SelectItem value="Outros">Manutenção / Outros</SelectItem>
                                                <SelectItem value="Serviços">Serviços Terceirizados</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Conta de Destino/Origem</Label>
                                <Select value={dailyEntry.accountId} onValueChange={(val) => setDailyEntry({...dailyEntry, accountId: val})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {businessAccounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSaveDailyEntry}>
                                Confirmar Lançamento
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* New Product Button */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="icon" className="rounded-full bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-6 h-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Novo Produto/Serviço</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: Hambúrguer" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço de Venda</Label>
                                    <Input type="number" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: e.target.value})} placeholder="0.00" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vendas/Mês (Média)</Label>
                                    <Input type="number" value={newProduct.averageMonthlySales} onChange={e => setNewProduct({...newProduct, averageMonthlySales: e.target.value})} placeholder="0" />
                                </div>
                            </div>
                            
                            <div className="space-y-2 border-t pt-4">
                                <Label className="text-blue-600 font-bold">Custos Diretos (Por unidade)</Label>
                                <div className="flex gap-2">
                                    <Input className="flex-1" value={newCostName} onChange={e => setNewCostName(e.target.value)} placeholder="Item (ex: Carne)" />
                                    <Input className="w-24" type="number" value={newCostValue} onChange={e => setNewCostValue(e.target.value)} placeholder="R$" />
                                    <Button onClick={handleAddCost} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-2 rounded-md">
                                    {newProduct.directCosts.map((cost, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{cost.name}</span>
                                            <span className="font-bold">R$ {cost.value.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    {newProduct.directCosts.length === 0 && <p className="text-xs text-gray-400 text-center">Nenhum custo adicionado</p>}
                                </div>
                            </div>

                            <Button className="w-full bg-blue-600" onClick={handleSaveProduct}>Salvar Produto</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8 pb-24">
            
            {/* Business Overview Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-blue-600 text-white border-none shadow-lg">
                    <p className="text-blue-100 text-xs mb-1">Caixa da Empresa</p>
                    <h2 className="text-2xl font-bold">R$ {businessAccounts.reduce((acc, curr) => acc + curr.balance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    <p className="text-[10px] text-blue-200 mt-1">Saldo acumulado</p>
                </Card>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm">
                    <p className="text-gray-500 text-xs mb-1">Lucro Líquido (Est.)</p>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {metrics.totalMonthlyProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    <p className="text-[10px] text-green-600 mt-1">Baseado em vendas projetadas</p>
                </Card>
            </div>

             {/* Recent Business Transactions */}
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Extrato Empresarial</h3>
                    <Link href="/ai-chat?context=extrato_empresarial">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Analisar Extrato
                        </Button>
                    </Link>
                </div>
                {businessTransactions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nenhuma movimentação registrada ainda.</p>
                ) : (
                    <div className="space-y-2">
                        {businessTransactions.slice(0, 5).map(tx => (
                            <EditTransactionSheet key={tx.id} transaction={tx}>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                                        tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{tx.description}</p>
                                        <p className="text-[10px] text-gray-500">{format(new Date(tx.date), 'dd/MM')} • {tx.category}</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                    {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                                </span>
                            </div>
                            </EditTransactionSheet>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Insights */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        Análise do Negócio
                    </h3>
                    <Link href="/ai-chat">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Falar com Mentor
                        </Button>
                    </Link>
                </div>
                
                {/* Simulated AI Analysis Request */}
                <Card className="p-4 border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
                    <div className="flex gap-3">
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full h-fit">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                "Baseado nas suas vendas de {format(new Date(), 'MMMM', { locale: undefined })} (R$ {businessTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString('pt-BR')}), sua margem de lucro está em {(metrics.averageMargin || 0).toFixed(0)}%. Sugiro focar no produto '{metrics.calculatedProducts[0]?.name || 'Principal'}' que tem a maior margem."
                            </p>
                            <Link href="/ai-chat">
                                <Button size="sm" variant="outline" className="w-full h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-100">
                                    Pedir análise detalhada
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>

                {insights.map((insight, idx) => (
                    <Card key={idx} className={`p-4 border-l-4 ${
                        insight.type === 'danger' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' : 
                        insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 
                        'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                    } border-y-0 border-r-0 rounded-r-xl shadow-sm`}>
                        <h4 className={`font-bold text-sm ${
                             insight.type === 'danger' ? 'text-red-700 dark:text-red-400' : 
                             insight.type === 'warning' ? 'text-yellow-700 dark:text-yellow-400' : 
                             'text-green-700 dark:text-green-400'
                        }`}>{insight.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.message}</p>
                    </Card>
                ))}
            </div>

            {/* Products List */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Seus Produtos</h3>
                {metrics.calculatedProducts.map(p => (
                    <EditProductDialog key={p.id} product={p}>
                    <Card className="p-4 overflow-hidden relative cursor-pointer hover:border-blue-300 transition-all group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 bg-gray-100 rounded-full text-gray-500">
                                <Edit2 className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{p.name}</h3>
                                <p className="text-xs text-gray-500">{p.averageMonthlySales} vendas/mês</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold block">R$ {p.sellingPrice.toFixed(2)}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.netProfit > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {p.grossMarginPercent.toFixed(0)}% Margem
                                </span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 -mx-4 -mb-4 p-4 border-t">
                            <div>
                                <p className="text-gray-500">Custo Unitário</p>
                                <p className="font-semibold text-gray-900">R$ {p.totalUnitCost.toFixed(2)}</p>
                                <p className="text-[10px] text-gray-400">(Direto: {p.totalDirectCost.toFixed(2)} + Fixo: {p.fixedCostShare.toFixed(2)})</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Lucro Líquido</p>
                                <p className={`font-semibold ${p.netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {p.netProfit.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </Card>
                    </EditProductDialog>
                ))}
            </div>

             {/* Profit Chart */}
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Lucratividade por Produto</h3>
                <Card className="p-4 bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-sm">
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <XAxis type="number" hide />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="lucro" name="Lucro Mensal" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.lucro > 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            
        </div>
      </div>
    </MobileLayout>
  );
}
