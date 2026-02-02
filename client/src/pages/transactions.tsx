import { getCategoryIcon, formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft, Table as TableIcon, AlertCircle, Clock, CheckCircle2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useFinancialStore, Category } from "@/lib/store";
import { format, isBefore, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreVertical, Trash2, Edit, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Transactions() {
  const [location, setLocation] = useLocation();
  const allTransactions = useFinancialStore((state) => state.transactions);
  const accounts = useFinancialStore((state) => state.accounts);
  
  // Parse query params for initial filters
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get('type') as 'all' | 'income' | 'expense' | null;
  const initialStatus = searchParams.get('status') as 'all' | 'pending' | 'paid' | 'overdue' | null;

  // Filter State
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'this-month' | 'next-month' | 'future' | 'custom'>(initialStatus === 'overdue' ? 'all' : 'this-month');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>(initialType || 'all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>(initialStatus || 'all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [customStart, setCustomStart] = useState(format(startOfDay(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const status = params.get('status');
    
    if (type === 'income' || type === 'expense') {
        setFilterType(type);
    }
    
    if (status === 'overdue' || status === 'pending' || status === 'paid') {
        setFilterStatus(status as any);
        // If filtering by overdue, we usually want to see ALL overdue items regardless of period, 
        // or at least not restricted to "this month" if the overdue item is old.
        if (status === 'overdue') {
            setFilterPeriod('all');
        }
    }
  }, [location]);

  const transactions = useMemo(() => {
    let filtered = allTransactions.filter(t => t.isPersonal);
    const now = new Date();

    // Type Filter
    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    // Status Filter
    // Normalize missing status: if undefined, treat as 'paid' (backward compatibility)
    const getTxStatus = (t: any) => (t.status === 'pending' ? 'pending' : 'paid');

    if (filterStatus !== 'all') {
        if (filterStatus === 'paid') {
            filtered = filtered.filter(t => getTxStatus(t) === 'paid');
        } else if (filterStatus === 'pending') {
            filtered = filtered.filter(t => getTxStatus(t) === 'pending');
        } else if (filterStatus === 'overdue') {
            filtered = filtered.filter(t => getTxStatus(t) === 'pending' && isBefore(new Date(t.date), startOfDay(now)));
        }
    }

    // Category Filter
    if (filterCategory !== 'all') {
        filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Account Filter
    if (filterAccount !== 'all') {
        filtered = filtered.filter(t => t.accountId === filterAccount);
    }

    // Search Filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t => {
            const account = accounts.find(a => a.id === t.accountId);
            const accountName = account ? account.name.toLowerCase() : '';
            const dateStr = format(new Date(t.date), 'dd/MM/yyyy').toLowerCase();
            
            return (
                t.description.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query) ||
                accountName.includes(query) ||
                dateStr.includes(query) ||
                t.amount.toString().includes(query)
            );
        });
    }

    if (filterPeriod === 'this-month') {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        filtered = filtered.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    } else if (filterPeriod === 'next-month') {
        const nextMonth = addMonths(now, 1);
        const start = startOfMonth(nextMonth);
        const end = endOfMonth(nextMonth);
        filtered = filtered.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    } else if (filterPeriod === 'future') {
        filtered = filtered.filter(t => new Date(t.date) > now);
    } else if (filterPeriod === 'custom') {
        const start = startOfDay(new Date(customStart));
        const end = endOfDay(new Date(customEnd));
        filtered = filtered.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    }
    
    // Sort logic
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, filterPeriod, customStart, customEnd, filterType, filterCategory, filterAccount, searchQuery, accounts]);

  // Grouping Logic for Installments
  const groupedTransactions = useMemo(() => {
      const groups: Record<string, typeof transactions> = {};
      const standalone: typeof transactions = [];

      // Identify installments pattern: "Description (X/Y)"
      const installmentRegex = /^(.*) \((\d+)\/(\d+)\)$/;

      // First pass: build groups + standalone
      transactions.forEach(tx => {
          const match = tx.description.match(installmentRegex);
          if (match) {
              const baseDesc = match[1].trim();
              const totalInstallments = match[3]; // Y part
              // Use a composite key including amount/category to avoid mixing similar named items
              const key = `${baseDesc}|${totalInstallments}|${tx.category}|${tx.amount.toFixed(2)}`;

              if (!groups[key]) groups[key] = [];
              groups[key].push(tx);
          } else {
              standalone.push(tx);
          }
      });

      type TransactionItem = typeof transactions[number];
      const finallist: (TransactionItem | { isGroup: true, items: TransactionItem[], key: string })[] = [];

      // Add groups first (so we can exclude their items from standalone)
      const groupedIds = new Set<string>();

      Object.entries(groups).forEach(([key, items]) => {
          if (items.length > 1) {
              items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              items.forEach(i => groupedIds.add(i.id));
              finallist.push({ isGroup: true, items, key });
          } else {
              // Only 1 item visible in this filter? treat as standalone item
              finallist.push(...items);
          }
      });

      // Add standalone items that are NOT part of any group
      finallist.push(...standalone.filter(tx => !groupedIds.has(tx.id)));

      // Re-sort everything by date (using the date of the first item for groups)
      return finallist.sort((a, b) => {
          const dateA = new Date('isGroup' in a ? a.items[0].date : a.date).getTime();
          const dateB = new Date('isGroup' in b ? b.items[0].date : b.date).getTime();
          return dateB - dateA; // Newest first
      });
  }, [transactions]);

  // Projections
  const projections = useMemo(() => {
      const pendingIncome = transactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      const pendingExpense = transactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      return { pendingIncome, pendingExpense, net: pendingIncome - pendingExpense };
  }, [transactions]);

  const categories = useFinancialStore((state) => state.transactionCategories);

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 pb-2 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Extrato</h1>
            <div className="flex gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-9 w-9 ${showFilters ? 'bg-primary/10 text-primary' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" />
                </Button>
                <Link href="/spreadsheet">
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                        <TableIcon className="w-4 h-4" />
                        Planilha
                    </Button>
                </Link>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
              <div className="mb-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-medium ml-1">Status</span>
                      <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="paid">Pago</SelectItem>
                              <SelectItem value="overdue">Atrasado</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-medium ml-1">Tipo</span>
                      <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="income">Entradas</SelectItem>
                              <SelectItem value="expense">Saídas</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-medium ml-1">Categoria</span>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {categories.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-medium ml-1">Conta / Carteira</span>
                      <Select value={filterAccount} onValueChange={setFilterAccount}>
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900">
                              <SelectValue placeholder="Todas as contas" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas as contas</SelectItem>
                              {accounts.filter(a => a.isPersonal).map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          )}
          
          {/* Period Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            <button 
                onClick={() => setFilterPeriod('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Tudo
            </button>
            <button 
                onClick={() => setFilterPeriod('this-month')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'this-month' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Este Mês
            </button>
            <button 
                onClick={() => setFilterPeriod('next-month')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'next-month' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Próximo Mês
            </button>
            <button 
                onClick={() => setFilterPeriod('future')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'future' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Futuro
            </button>
            <button 
                onClick={() => setFilterPeriod('custom')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterPeriod === 'custom' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}
            >
                Personalizado
            </button>
          </div>
          
          {filterPeriod === 'custom' && (
              <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex-1">
                    <span className="text-[10px] text-gray-500 mb-1 block">De</span>
                    <Input 
                        type="date" 
                        value={customStart}
                        onChange={e => setCustomStart(e.target.value)}
                        className="h-9 text-xs bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                    />
                </div>
                <div className="flex-1">
                    <span className="text-[10px] text-gray-500 mb-1 block">Até</span>
                    <Input 
                        type="date" 
                        value={customEnd}
                        onChange={e => setCustomEnd(e.target.value)}
                        className="h-9 text-xs bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                    />
                </div>
              </div>
          )}

          {/* Projections Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-zinc-900 dark:to-black rounded-2xl p-4 text-white shadow-lg mb-4">
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Projeção do Período</h3>
                <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-[10px] text-gray-400 block">A Receber</span>
                    <span className="text-lg font-bold text-green-400">{formatCurrency(projections.pendingIncome)}</span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-400 block">A Pagar</span>
                    <span className="text-lg font-bold text-red-400">{formatCurrency(projections.pendingExpense)}</span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                 <span className="text-xs text-gray-400">Saldo Projetado</span>
                 <span className={`font-bold ${projections.net >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                    {formatCurrency(projections.net)}
                 </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar por descrição, banco, categoria, data..." 
              className="pl-9 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 h-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {groupedTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma transação encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-white dark:bg-black py-2">Recentes</h3>
              {groupedTransactions.map((item, idx) => {
                  if ('isGroup' in item) {
                      return <GroupedTransactionItem key={`group-${item.key}-${idx}`} group={item as any} />;
                  } else {
                      return <TransactionItem key={item.id} tx={item} />;
                  }
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

function GroupedTransactionItem({ group }: { group: { isGroup: true, items: any[], key: string } }) {
    const [isOpen, setIsOpen] = useState(false);
    const { removeTransaction, updateTransaction } = useFinancialStore();
    
    // Edit Dialog State
    const [showEditDialog, setShowEditDialog] = useState(false);
    
    const firstItem = group.items[0];
    const match = firstItem.description.match(/^(.*) \((\d+)\/(\d+)\)$/);
    const baseDesc = match ? match[1] : firstItem.description;
    const totalInstallments = match ? match[3] : '?';
    
    const [editName, setEditName] = useState(baseDesc);
    const [editCategory, setEditCategory] = useState<Category>(firstItem.category);
    
    // Update local state when baseDesc changes
    useEffect(() => {
        setEditName(baseDesc);
        setEditCategory(firstItem.category);
    }, [baseDesc, firstItem.category]);
    
    // Summary values
    const totalAmount = group.items.reduce((acc, curr) => acc + curr.amount, 0);
    const paidCount = group.items.filter(i => i.status === 'paid').length;
    const totalCount = group.items.length;
    const isOverdue = group.items.some(i => i.status === 'pending' && isBefore(new Date(i.date), startOfDay(new Date())));

    const handleDeleteGroup = () => {
        if (confirm(`Tem certeza que deseja excluir todas as ${totalCount} parcelas de "${baseDesc}"?`)) {
            group.items.forEach(item => removeTransaction(item.id));
            toast({
                title: "Grupo excluído",
                description: `${totalCount} lançamentos foram removidos.`
            });
        }
    };

    const handleSaveGroup = () => {
        group.items.forEach(item => {
            let newDescription = item.description;
            // Preserve installment number logic: "Desc (X/Y)"
            const match = item.description.match(/^(.*) \((\d+\/\d+)\)$/);
            if (match) {
                newDescription = `${editName} (${match[2]})`;
            } else {
                newDescription = editName; 
            }

            updateTransaction(item.id, {
                description: newDescription,
                category: editCategory
            });
        });
        
        setShowEditDialog(false);
        toast({
            title: "Grupo atualizado",
            description: "Todas as parcelas foram atualizadas."
        });
    };

    const categories: Category[] = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros', 'Salário', 'Vendas', 'Serviços'];

    return (
        <>
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Grupo</DialogTitle>
                    <DialogDescription>
                        Alterações aqui afetarão todas as {totalCount} parcelas deste grupo.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Descrição do Grupo</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={editCategory} onValueChange={(v: Category) => setEditCategory(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveGroup}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={`rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden mb-3 shadow-sm ${isOverdue ? 'border-red-200 dark:border-red-900/30' : ''}`}>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <CollapsibleTrigger className="flex-1 flex items-center justify-between mr-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-2xl relative">
                                {getCategoryIcon(firstItem.category)}
                                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border-2 border-white dark:border-zinc-900 font-bold">
                                    {totalCount}x
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    {baseDesc}
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </p>
                                <p className="text-xs text-gray-500 text-left">
                                    Parcelado em {totalInstallments}x • {paidCount} Pagos
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-bold block text-gray-900 dark:text-white">
                                {formatCurrency(totalAmount)}
                            </span>
                            <span className="text-[10px] text-purple-600 font-medium">
                                Total do Grupo
                            </span>
                        </div>
                    </CollapsibleTrigger>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Grupo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDeleteGroup} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir Grupo
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <CollapsibleContent>
                    <div className="bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-100 dark:border-zinc-800 pl-4">
                        {group.items.map((tx, idx) => (
                            <div key={tx.id} className={`pr-3 ${idx !== group.items.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}>
                                <TransactionItem tx={tx} isChild={true} />
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
        </>
    );
}

function TransactionItem({ tx, isChild = false }: { tx: any, isChild?: boolean }) {
  const accounts = useFinancialStore(state => state.accounts);
  const account = accounts.find(a => a.id === tx.accountId);
  
  const isOverdue = tx.status === 'pending' && isBefore(new Date(tx.date), startOfDay(new Date()));
  const isPending = tx.status === 'pending';

  return (
    <EditTransactionSheet transaction={tx}>
    <div className={`flex items-center justify-between py-3 group cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/80 rounded-xl px-3 -mx-3 transition-colors ${isChild ? 'scale-95 origin-left w-full pl-0' : ''} ${isOverdue && !isChild ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
      <div className="flex items-center gap-4">
        {!isChild && (
            <div className={`w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-2xl relative`}>
            {getCategoryIcon(tx.category)}
            
            {/* Status Badge on Icon */}
            {isOverdue && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                    <AlertCircle className="w-3 h-3 text-white" />
                </div>
            )}
            {!isOverdue && isPending && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                    <Clock className="w-3 h-3 text-white" />
                </div>
            )}
            </div>
        )}
        <div className={isChild ? "ml-2" : ""}>
          <div className="flex items-center gap-2">
            <p className={`font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors ${isChild ? 'text-sm' : ''}`}>{tx.description}</p>
            {isOverdue && <span className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">ATRASADO</span>}
            {!isOverdue && isPending && <span className="text-[9px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">PENDENTE</span>}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {!isChild && <>{tx.category} • </>} {format(new Date(String(tx.date || '').length === 10 ? `${tx.date}T12:00:00` : tx.date), 'dd/MM HH:mm')}
            {account && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                <span className="font-medium text-gray-600 dark:text-gray-400">{account.name}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-bold block ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
        </span>
        {isPending ? (
            <span className="text-[10px] text-gray-400 font-medium">Previsto</span>
        ) : (
            <span className="text-[10px] text-green-600 font-medium flex items-center justify-end gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Pago
            </span>
        )}
      </div>
    </div>
    </EditTransactionSheet>
  );
}
