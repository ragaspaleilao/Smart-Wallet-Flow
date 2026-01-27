import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Pause, CalendarDays, Wallet, CheckCircle2, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function CancelSubscription() {
  const [_, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // In a real app, we'd fetch the specific subscription ID from the URL
  const subscription = {
    name: "Disney+",
    price: 33.90,
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    color: "bg-[#113ccf]",
    saved: 135.60,
    nextBill: "Amanhã"
  };

  const handleConfirmCancel = () => {
    toast({
        title: "Solicitação Enviada",
        description: "O cancelamento foi agendado com sucesso.",
    });
    setLocation("/subscriptions");
  };

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black">
        
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 sticky top-0 z-10">
            <Link href="/subscriptions">
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cancelar Assinatura</h1>
        </div>

        <div className="flex-1 p-6">
            
            {/* Service Header */}
            <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg mb-4 p-4 ${subscription.color}`}>
                    <img src={subscription.logo} alt={subscription.name} className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{subscription.name}</h2>
                <p className="text-gray-500 font-medium">{formatCurrency(subscription.price)}/mês</p>
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 text-center">
                        <h3 className="font-bold text-red-800 dark:text-red-400 text-lg mb-2">Tem certeza?</h3>
                        <p className="text-sm text-red-700/80 dark:text-red-300/80">
                            Ao cancelar, você perderá acesso imediato aos filmes e séries exclusivos.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-500" />
                            O que você economizou
                        </h4>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50 dark:border-zinc-800">
                            <span className="text-gray-500">Total economizado este ano</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(subscription.saved)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2">
                            <span className="text-gray-500">Próxima cobrança</span>
                            <span className="font-bold text-gray-900 dark:text-white">{subscription.nextBill}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <Button 
                            className="w-full h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 font-bold text-base shadow-none border-none"
                            onClick={() => setLocation("/subscriptions")}
                        >
                            Manter Assinatura
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl font-medium"
                            onClick={() => setStep(2)}
                        >
                            Quero Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="space-y-4">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">Antes de ir...</h3>
                        <p className="text-gray-500 text-sm">
                            Que tal uma alternativa em vez de cancelar definitivamente?
                        </p>
                     </div>

                     <div className="grid gap-4">
                        <button className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-purple-500 dark:hover:border-purple-500 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600">
                                <Pause className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Pausar por 1 mês</h4>
                                <p className="text-xs text-gray-500 mt-0.5">Não será cobrado na próxima fatura</p>
                            </div>
                        </button>

                        <button className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-blue-500 dark:hover:border-blue-500 transition-colors group">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Lembrar mais tarde</h4>
                                <p className="text-xs text-gray-500 mt-0.5">Me avise 3 dias antes de vencer</p>
                            </div>
                        </button>
                     </div>

                     <div className="pt-8">
                        <Button 
                            className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-200 dark:shadow-none"
                            onClick={handleConfirmCancel}
                        >
                            <XCircle className="w-5 h-5 mr-2" />
                            Confirmar Cancelamento
                        </Button>
                        <Button 
                            variant="ghost"
                            className="w-full mt-4 text-gray-500 font-medium"
                            onClick={() => setLocation("/subscriptions")}
                        >
                            Voltar
                        </Button>
                     </div>
                </div>
            )}
        </div>
      </div>
    </MobileLayout>
  );
}
