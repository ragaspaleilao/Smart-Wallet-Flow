import { MobileLayout } from "@/components/mobile-layout";
import { useFinancialStore, Transaction, Category } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Save, 
  Download, 
  Filter, 
  MoreHorizontal,
  Copy,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import { Badge } from "@/components/ui/badge";

export default function SpreadsheetView() {
  const { transactions, accounts, addTransaction, updateTransaction, removeTransaction } = useFinancialStore();
  
  // Local state for editing
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filtering
  const [filterType, setFilterType] = useState<string>("all");
  
  // Selection Logic
  const toggleSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = (visibleIds: string[]) => {
    if (selectedRows.length === visibleIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(visibleIds);
    }
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || t.type === filterType;
      
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType]);

  // Actions
  const handleAddNew = () => {
    const newTx = {
      amount: 0,
      type: 'expense' as const,
      category: 'Outros' as Category,
      description: 'Nova Transação',
      date: new Date().toISOString(),
      source: 'manual' as const,
      isPersonal: true,
      status: 'pending' as const
    };
    addTransaction(newTx);
    toast({ title: "Linha adicionada", description: "Nova transação criada." });
  };

  const handleDeleteSelected = () => {
    if (confirm(`Excluir ${selectedRows.length} itens?`)) {
      selectedRows.forEach(id => removeTransaction(id));
      setSelectedRows([]);
      toast({ title: "Itens excluídos" });
    }
  };

  const handleBulkStatusChange = (status: 'paid' | 'pending') => {
    selectedRows.forEach(id => updateTransaction(id, { status }));
    toast({ title: "Status atualizado", description: `${selectedRows.length} itens atualizados.` });
    setSelectedRows([]);
  };

  // Render Cell Content based on editing state
  const CellInput = ({ value, onChange, type = "text", className = "" }: any) => (
    <input 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className={`w-full bg-transparent border-none focus:ring-0 p-1 text-sm ${className}`}
      onClick={e => e.stopPropagation()}
    />
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Spreadsheet Header */}
      <div className="border-b border-gray-200 dark:border-zinc-800 p-2 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md">
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
                <div className="bg-current rounded-[1px]"></div>
            </div>
            <span className="text-xs font-bold">Planilha Financeira</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input 
                placeholder="Buscar..." 
                className="pl-7 h-8 text-xs bg-gray-100 dark:bg-zinc-800 rounded-md border-none focus:ring-1 focus:ring-green-500 w-40"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           {selectedRows.length > 0 ? (
             <div className="flex items-center gap-1 animate-in slide-in-from-top-2 fade-in">
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleDeleteSelected}>
                    <Trash2 className="w-3 h-3 mr-1" /> Excluir ({selectedRows.length})
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkStatusChange('paid')}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Pagar
                </Button>
             </div>
           ) : (
             <>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddNew}>
                    <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Nova Linha</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Download className="w-4 h-4" />
                </Button>
             </>
           )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800 p-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
         <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-7 text-xs w-[100px] border-none bg-transparent shadow-none">
                <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
         </Select>
         <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1"></div>
         <div className="text-[10px] text-gray-500 px-2">
            {filteredData.length} registros encontrados
         </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto relative">
        <Table className="border-collapse w-full min-w-[1000px]">
          <TableHeader className="bg-gray-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
            <TableRow className="border-b border-gray-200 dark:border-zinc-800 hover:bg-transparent">
              <TableHead className="w-[40px] px-2 text-center">
                <Checkbox 
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onCheckedChange={() => toggleAll(filteredData.map(t => t.id))}
                />
              </TableHead>
              <TableHead className="w-[100px] text-xs font-semibold h-9">Data</TableHead>
              <TableHead className="w-[200px] text-xs font-semibold h-9">Descrição</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold h-9">Categoria</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold h-9">Conta</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold h-9 text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold h-9 text-center">Status</TableHead>
              <TableHead className="w-[150px] text-xs font-semibold h-9">Observações</TableHead>
              <TableHead className="w-[40px] h-9"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => (
              <TableRow 
                key={row.id} 
                className={`
                    border-b border-gray-100 dark:border-zinc-800 h-9 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group text-xs
                    ${selectedRows.includes(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                <TableCell className="px-2 text-center py-1">
                  <Checkbox 
                    checked={selectedRows.includes(row.id)}
                    onCheckedChange={() => toggleSelection(row.id)}
                  />
                </TableCell>
                <TableCell className="p-0">
                    <input 
                        type="date"
                        className="w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={row.date.split('T')[0]}
                        onChange={(e) => updateTransaction(row.id, { date: new Date(e.target.value).toISOString() })}
                    />
                </TableCell>
                <TableCell className="p-0 relative">
                    <input 
                        className="w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 font-medium"
                        value={row.description}
                        onChange={(e) => updateTransaction(row.id, { description: e.target.value })}
                    />
                </TableCell>
                <TableCell className="p-0">
                    <select 
                        className="w-full h-full bg-transparent px-1 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
                        value={row.category}
                        onChange={(e) => updateTransaction(row.id, { category: e.target.value as Category })}
                    >
                        <option value="Alimentação">Alimentação</option>
                        <option value="Transporte">Transporte</option>
                        <option value="Lazer">Lazer</option>
                        <option value="Moradia">Moradia</option>
                        <option value="Saúde">Saúde</option>
                        <option value="Educação">Educação</option>
                        <option value="Salário">Salário</option>
                        <option value="Outros">Outros</option>
                    </select>
                </TableCell>
                <TableCell className="p-0">
                    <select 
                        className="w-full h-full bg-transparent px-1 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none"
                        value={row.accountId}
                        onChange={(e) => updateTransaction(row.id, { accountId: e.target.value })}
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </TableCell>
                <TableCell className="p-0">
                    <input 
                        className={`w-full h-full bg-transparent px-2 text-xs text-right focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 font-mono ${row.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                        value={row.amount}
                        type="number"
                        step="0.01"
                        onChange={(e) => updateTransaction(row.id, { amount: parseFloat(e.target.value) })}
                    />
                </TableCell>
                <TableCell className="p-0 text-center">
                    <button 
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${row.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}
                        onClick={() => updateTransaction(row.id, { status: row.status === 'paid' ? 'pending' : 'paid' })}
                    >
                        {row.status === 'paid' ? 'Pago' : 'Pendente'}
                    </button>
                </TableCell>
                <TableCell className="p-0">
                    <input 
                        className="w-full h-full bg-transparent px-2 text-xs focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-500"
                        value={row.notes || ""}
                        placeholder="Adicionar nota..."
                        onChange={(e) => updateTransaction(row.id, { notes: e.target.value })}
                    />
                </TableCell>
                <TableCell className="px-2 text-center text-gray-400">
                    <MoreHorizontal className="w-3 h-3 mx-auto cursor-pointer hover:text-black dark:hover:text-white" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-2 text-[10px] text-gray-500 flex justify-between items-center">
        <span>Autosave ativado</span>
        <span>Mostrando {filteredData.length} linhas</span>
      </div>
    </div>
  );
}
