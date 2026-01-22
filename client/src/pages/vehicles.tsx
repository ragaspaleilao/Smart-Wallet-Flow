import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Car, AlertTriangle, Calendar, Plus } from "lucide-react";
import { Link } from "wouter";
import { useFinancialStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Vehicles() {
  const vehicles = useFinancialStore((state) => state.vehicles);
  const addVehicle = useFinancialStore((state) => state.addVehicle);
  
  const [open, setOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: "", plate: "" });

  const handleAdd = () => {
    if (!newVehicle.name || !newVehicle.plate) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    addVehicle({
        name: newVehicle.name,
        plate: newVehicle.plate,
        expenses: [] // Start with no scheduled expenses
    });

    setNewVehicle({ name: "", plate: "" });
    setOpen(false);
    toast({ title: "Veículo adicionado!" });
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
                    <Button className="w-full" onClick={handleAdd}>Salvar Veículo</Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {vehicles.map((car) => (
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
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Despesas Programadas</h3>
                {car.expenses.length > 0 ? car.expenses.map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      {exp.status === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Calendar className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{exp.name}</p>
                        <p className={`text-xs ${exp.status === 'warning' ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                          Vence em {exp.due}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm">R$ {exp.value.toFixed(2)}</span>
                  </div>
                )) : (
                    <p className="text-sm text-gray-400 italic">Sem despesas cadastradas.</p>
                )}
              </div>
            </div>
          ))}

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
