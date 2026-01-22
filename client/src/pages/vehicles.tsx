import { MobileLayout } from "@/components/mobile-layout";
import { vehicles } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Car, AlertTriangle, Calendar, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Vehicles() {
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
           <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90">
             <Plus className="w-6 h-6" />
           </Button>
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
                {car.expenses.map((exp, idx) => (
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
                ))}
              </div>
            </div>
          ))}

          <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl">
            <p className="text-gray-500 text-sm mb-4">Tem mais algum veículo?</p>
            <Button variant="outline">Adicionar Moto/Carro</Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
