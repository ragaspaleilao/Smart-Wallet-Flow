import { formatCurrency as globalFormatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { Plus, Car, Calendar, FileText, Wrench, Shield, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, Trash2, Edit2, AlertTriangle, DollarSign } from "lucide-react";
import { useFinancialStore, Vehicle, Transaction } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { format, addMonths, isBefore, startOfDay, parseISO } from "date-fns";

export default function Vehicles() {
  const { vehicles, addVehicle, updateVehicle, removeVehicle, transactions, addTransaction, removeTransaction, accounts } = useFinancialStore();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const [editingVehicle, setEditingVehicle] = useState({
      id: "",
      name: "",
      plate: ""
  });

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    plate: "",
  });

  // Expense Form State
  const [expenseType, setExpenseType] = useState("Manutenção");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState<'cash' | 'installments'>('cash');
  const [installments, setInstallments] = useState(2);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || "");

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
        ...prev,
        [groupId]: !prev[groupId]
    }));
  };

  const handleAddVehicle = () => {
    if (!newVehicle.name || !newVehicle.plate) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }
    addVehicle({
      name: newVehicle.name,
      plate: newVehicle.plate,
      expenses: []
    });
    setOpen(false);
    setNewVehicle({ name: "", plate: "" });
    toast({ title: "Veículo adicionado!" });
  };

  const handleEditVehicle = () => {
    if (!editingVehicle.name || !editingVehicle.plate) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }
    updateVehicle(editingVehicle.id, {
        name: editingVehicle.name,
        plate: editingVehicle.plate
    });
    setEditOpen(false);
    toast({ title: "Veículo atualizado!" });
  };

  const handleDeleteVehicle = () => {
     if (selectedVehicleId) {
         removeVehicle(selectedVehicleId);
         setDeleteOpen(false);
         toast({ title: "Veículo removido com sucesso" });
     }
  };

  const handleDeleteGroup = (vehicleId: string, groupName: string) => {
      if (confirm(`Tem certeza que deseja excluir todas as parcelas de "${groupName}"?`)) {
          const txsToDelete = transactions.filter(t => 
              t.vehicleId === vehicleId && 
              t.description.replace(/\s\(\d+\/\d+\)$/, "") === groupName
          );
          
          txsToDelete.forEach(tx => removeTransaction(tx.id));
          toast({ title: "Despesa completa removida!" });
      }
  };

  const handleAddExpense = () => {
    if (!expenseAmount || !selectedVehicleId) return;

    // Remove non-numeric characters and parse to number
    const numericAmount = Number(expenseAmount.replace(/\D/g, "")) / 100;
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    
    if (paymentType === 'installments') {
        const installmentValue = numericAmount / installments;
        const baseDate = new Date(expenseDate);

        for (let i = 0; i < installments; i++) {
            const newDate = new Date(baseDate);
            newDate.setMonth(baseDate.getMonth() + i);
            
            addTransaction({
                amount: installmentValue,
                type: 'expense',
                category: 'Transporte',
                description: `${expenseType} - ${vehicle?.name} (${i + 1}/${installments})`,
                source: 'manual',
                isPersonal: true,
                accountId,
                status: 'pending',
                date: newDate.toISOString(),
                vehicleId: selectedVehicleId
            });
        }
        toast({ title: "Despesa parcelada lançada!" });
    } else {
        addTransaction({
            amount: numericAmount,
            type: 'expense',
            category: 'Transporte',
            description: `${expenseType} - ${vehicle?.name}`,
            source: 'manual',
            isPersonal: true,
            accountId,
            status: 'pending', // Default to pending/scheduled
            date: new Date(expenseDate).toISOString(),
            vehicleId: selectedVehicleId
        });
        toast({ title: "Despesa lançada!" });
    }

    setExpenseOpen(false);
    setExpenseAmount("");
    setExpenseType("Manutenção");
  };

  const formatCurrency = (val: string) => {
    const number = val.replace(/\D/g, "");
    return (Number(number) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <MobileLayout>
       <div className="flex flex-col min-h-full p-6 bg-gray-50 dark:bg-black">
        <div className="flex justify-between items-center pt-6 mb-8">
           <div className="flex items-center gap-3">
             <Link href="/settings">
               <Button variant="ghost" size="icon" className="-ml-3">
                 <Car className="w-6 h-6" />
               </Button>
             </Link>
             <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Veículos</h1>
             </div>
           </div>
           
           <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90">
                    <Plus className="w-6 h-6" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Novo Veículo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input 
                            placeholder="Ex: Fiat Argo" 
                            value={newVehicle.name}
                            onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Placa</Label>
                        <Input 
                            placeholder="ABC-1234" 
                            value={newVehicle.plate}
                            onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value})}
                        />
                    </div>
                    <Button className="w-full" onClick={handleAddVehicle}>Salvar Veículo</Button>
                </div>
            </DialogContent>
          </Dialog>

          {/* Edit Vehicle Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Veículo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input 
                            placeholder="Ex: Fiat Argo" 
                            value={editingVehicle.name}
                            onChange={(e) => setEditingVehicle({...editingVehicle, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Placa</Label>
                        <Input 
                            placeholder="ABC-1234" 
                            value={editingVehicle.plate}
                            onChange={(e) => setEditingVehicle({...editingVehicle, plate: e.target.value})}
                        />
                    </div>
                    <Button className="w-full" onClick={handleEditVehicle}>Salvar Alterações</Button>
                </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Excluir Veículo</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-gray-500">
                        Tem certeza que deseja excluir este veículo? Todas as despesas associadas também serão removidas do controle de veículos (mas permanecerão no extrato geral).
                    </p>
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDeleteVehicle}>Excluir Veículo</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Expense Dialog */}
          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Despesa Veicular</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Tipo de Despesa</Label>
                        <Select value={expenseType} onValueChange={setExpenseType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IPVA">IPVA</SelectItem>
                                <SelectItem value="Licenciamento">Licenciamento</SelectItem>
                                <SelectItem value="Seguro">Seguro</SelectItem>
                                <SelectItem value="Manutenção">Manutenção</SelectItem>
                                <SelectItem value="Multa">Multa</SelectItem>
                                <SelectItem value="Combustível">Combustível</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Valor Total</Label>
                        <Input 
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(formatCurrency(e.target.value))}
                            placeholder="R$ 0,00"
                            className="text-lg font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Vencimento / Pagamento</Label>
                        <Input 
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Conta para Pagamento</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as any)} className="w-full pt-2">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="cash">À Vista</TabsTrigger>
                            <TabsTrigger value="installments">Parcelado</TabsTrigger>
                        </TabsList>
                        <TabsContent value="installments" className="pt-4">
                            <div className="space-y-2">
                                <Label>Número de Parcelas</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setInstallments(Math.max(2, installments - 1))}>-</Button>
                                    <div className="flex-1 h-10 flex items-center justify-center border rounded-md font-bold">
                                        {installments}x
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => setInstallments(Math.min(24, installments + 1))}>+</Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button className="w-full mt-4" onClick={handleAddExpense}>Lançar Despesa</Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {vehicles.map((car) => {
            // Get all transactions for this vehicle (pending and paid)
            const carTransactions = transactions
                .filter(t => t.vehicleId === car.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Group transactions by base description (removing installment info like (1/12))
            const groupedTransactions = carTransactions.reduce((groups, tx) => {
                // Regex to find and remove installment pattern like " (1/12)"
                const baseDescription = tx.description.replace(/\s\(\d+\/\d+\)$/, "");
                
                if (!groups[baseDescription]) {
                    groups[baseDescription] = [];
                }
                groups[baseDescription].push(tx);
                return groups;
            }, {} as Record<string, Transaction[]>);

            const groupKeys = Object.keys(groupedTransactions);

            return (
            <div key={car.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{car.name}</h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">{car.plate}</p>
                </div>
                <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingVehicle({
                            id: car.id,
                            name: car.name,
                            plate: car.plate
                        });
                        setEditOpen(true);
                    }}
                  >
                      <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full hover:bg-red-100 hover:text-red-500 text-gray-400"
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicleId(car.id);
                          setDeleteOpen(true);
                      }}
                  >
                      <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Despesas Programadas</h3>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                        onClick={() => {
                            setSelectedVehicleId(car.id);
                            setExpenseOpen(true);
                        }}
                    >
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                </div>
                
                {groupKeys.length > 0 ? groupKeys.map((groupName, idx) => {
                  const items = groupedTransactions[groupName];
                  const isExpanded = expandedGroups[`${car.id}-${idx}`];
                  
                  // Calculate Summary
                  const totalAmount = items.reduce((sum, t) => sum + t.amount, 0);
                  const paidCount = items.filter(t => t.status === 'paid').length;
                  const totalCount = items.length;
                  const nextDue = items.find(t => t.status === 'pending' && !isBefore(new Date(t.date), startOfDay(new Date()))) || items[items.length - 1];
                  const isLate = items.some(t => t.status === 'pending' && isBefore(new Date(t.date), startOfDay(new Date())));

                  return (
                    <div key={idx} className="rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                        {/* Group Header */}
                        <div 
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isLate ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-900'}`}
                            onClick={() => toggleGroup(`${car.id}-${idx}`)}
                        >
                            <div className="flex items-center gap-3">
                                {groupName.includes('IPVA') ? (
                                    <FileText className="w-5 h-5 text-gray-400" />
                                ) : groupName.includes('Seguro') ? (
                                    <Shield className="w-5 h-5 text-gray-400" />
                                ) : groupName.includes('Manutenção') ? (
                                    <Wrench className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                )}
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{groupName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        {paidCount}/{totalCount} parcelas pagas 
                                        {isLate && <span className="text-red-500 font-bold ml-1">• Pendente Vencido</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="font-bold text-sm block">{globalFormatCurrency(totalAmount)}</span>
                                    <span className="text-[10px] text-gray-400">Total</span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 -mr-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGroup(car.id, groupName);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="bg-white dark:bg-black border-t border-gray-100 dark:border-zinc-800 divide-y divide-gray-50 dark:divide-zinc-900">
                                {items.map(exp => {
                                    const isExpLate = exp.status === 'pending' && isBefore(new Date(exp.date), startOfDay(new Date()));
                                    const isPaid = exp.status === 'paid';
                                    
                                    return (
                                        <EditTransactionSheet key={exp.id} transaction={exp}>
                                            <div className="flex items-center justify-between p-3 pl-11 hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {exp.description}
                                                    </p>
                                                    <p className={`text-[10px] ${isExpLate ? 'text-red-500 font-bold' : isPaid ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {format(parseISO(exp.date), 'dd/MM/yyyy')} • {isPaid ? 'Pago' : isExpLate ? 'Vencido' : 'Em aberto'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-semibold ${isPaid ? 'text-green-600 line-through opacity-50' : 'text-gray-900 dark:text-white'}`}>
                                                        {globalFormatCurrency(exp.amount)}
                                                    </span>
                                                    {isPaid ? (
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                    ) : isExpLate ? (
                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                    ) : (
                                                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                                                    )}
                                                </div>
                                            </div>
                                        </EditTransactionSheet>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                  );
                }) : (
                    <div className="text-center py-4 text-gray-400 text-sm italic bg-gray-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800">
                        Nenhuma despesa registrada
                    </div>
                )}
              </div>
            </div>
          )})}

          {vehicles.length === 0 && (
             <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl">
                <p className="text-gray-500 text-sm mb-4">Nenhum veículo cadastrado.</p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}