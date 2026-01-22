import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Bell, Camera, Mic } from "lucide-react";
import { MobileLayout } from "@/components/mobile-layout";

export default function Permissions() {
  const [_, setLocation] = useLocation();

  return (
    <MobileLayout>
      <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Para a mágica acontecer
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Precisamos de algumas permissões para automatizar seus registros.
          </p>
        </div>

        <div className="w-full space-y-4">
          <Card className="p-4 flex items-center space-x-4 border-none shadow-sm bg-gray-50 dark:bg-zinc-900">
            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-sm">Notificações</h3>
              <p className="text-xs text-gray-500">Para lembrar de pagar contas e registrar gastos.</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center space-x-4 border-none shadow-sm bg-gray-50 dark:bg-zinc-900">
            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
              <Camera className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-sm">Câmera</h3>
              <p className="text-xs text-gray-500">Para digitalizar recibos e notas fiscais.</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center space-x-4 border-none shadow-sm bg-gray-50 dark:bg-zinc-900">
            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
              <Mic className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-sm">Microfone</h3>
              <p className="text-xs text-gray-500">Para registrar gastos usando apenas sua voz.</p>
            </div>
          </Card>
        </div>

        <div className="pt-8 w-full">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-medium rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => setLocation("/dashboard")}
          >
            Permitir e continuar
          </Button>
          <button 
            className="mt-4 text-sm text-gray-400 hover:text-gray-600"
            onClick={() => setLocation("/dashboard")}
          >
            Agora não
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
