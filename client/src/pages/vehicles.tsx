import { useState } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Car, AlertTriangle, Calendar, Plus, Wrench, FileText, Shield, AlertCircle } from "lucide-react";
import { useFinancialStore, Vehicle } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { format, addMonths, isBefore, startOfDay, parseISO } from "date-fns";

export default function Vehicles() {
  const { vehicles, addVehicle, transactions, addTransaction, accounts } = useFinancialStore();
  const [open, setOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
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

  const handleAddExpense = () => {
    if (!expenseAmount || !selectedVehicleId) return;

    const numericAmount = Number(expenseAmount.replace(/[^0-9,]/g, "").replace(",", ".")) / 100;
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
            // Get transactions related to this vehicle
            const carTransactions = transactions
                .filter(t => t.vehicleId === car.id && t.status === 'pending')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Merge with static expenses (legacy support) if needed, or just use transactions
            // For this implementation, we prioritize transactions as requested "interligado"
            
            return (
            <div key={car.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{car.name}</h2>
                  <p className="text-sm text-gray-500 font-mono mt-1">{car.plate}</p>
                </div>
                <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full">
                  <Car className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
                
                {carTransactions.length > 0 ? carTransactions.map((exp) => {
                  const isLate = isBefore(new Date(exp.date), startOfDay(new Date()));
                  return (
                  <div key={exp.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLate ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-zinc-950 border-gray-100 dark:border-zinc-800'}`}>
                    <div className="flex items-center gap-3">
                      {exp.description.includes('IPVA') ? (
                         <FileText className="w-5 h-5 text-gray-400" />
                      ) : exp.description.includes('Seguro') ? (
                         <Shield className="w-5 h-5 text-gray-400" />
                      ) : exp.description.includes('Manutenção') ? (
                         <Wrench className="w-5 h-5 text-gray-400" />
                      ) : (
                         <Calendar className="w-5 h-5 text-gray-400" />
                      )}
                      
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{exp.description}</p>
                        <p className={`text-xs ${isLate ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {isLate ? 'Venceu em' : 'Vence em'} {format(parseISO(exp.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm">R$ {exp.amount.toFixed(2)}</span>
                  </div>
                )}) : (
                    <div className="text-center py-4 text-gray-400 text-sm italic bg-gray-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800">
                        Nenhuma despesa pendente
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