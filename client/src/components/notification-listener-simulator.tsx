import { useState, useEffect } from "react";
import { Bell, CreditCard, Check, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFinancialStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Types of notifications to simulate
const SAMPLE_NOTIFICATIONS = [
  {
    app: "Nubank",
    title: "Compra aprovada",
    text: "Compra de R$ 45,90 em Padaria Estrela",
    amount: 45.90,
    merchant: "Padaria Estrela",
    type: "expense" as const
  },
  {
    app: "Inter",
    title: "Pix recebido",
    text: "Você recebeu um Pix de R$ 1.200,00 de Cliente X",
    amount: 1200.00,
    merchant: "Cliente X",
    type: "income" as const
  },
  {
    app: "iFood",
    title: "Pagamento realizado",
    text: "Seu pedido de R$ 89,90 foi confirmado",
    amount: 89.90,
    merchant: "iFood *Burger",
    type: "expense" as const
  }
];

export function NotificationListenerSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<typeof SAMPLE_NOTIFICATIONS[0] | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const addTransaction = useFinancialStore(state => state.addTransaction);

  const triggerNotification = (notif: typeof SAMPLE_NOTIFICATIONS[0]) => {
    setActiveNotification(notif);
    setShowConfirmation(true);
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (!activeNotification) return;

    addTransaction({
      amount: activeNotification.amount,
      type: activeNotification.type,
      category: activeNotification.type === 'income' ? 'Vendas' : 'Alimentação', // Simple auto-categorization
      description: activeNotification.merchant,
      source: 'notification',
      isPersonal: true // Default to personal
    });

    toast({
      title: "Transação salva!",
      description: `${activeNotification.type === 'expense' ? 'Despesa' : 'Receita'} de R$ ${activeNotification.amount.toFixed(2)} registrada.`,
    });

    setShowConfirmation(false);
    setActiveNotification(null);
  };

  return (
    <>
      {/* Dev Tool Toggle */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-black/80 text-white backdrop-blur border-none shadow-lg h-10 px-4 gap-2 hover:bg-black"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Smartphone className="w-4 h-4" />
          <span className="text-xs">Simular Android</span>
        </Button>
      </div>

      {/* Simulator Panel */}
      {isOpen && (
        <Card className="fixed bottom-36 right-4 z-50 w-72 p-4 bg-zinc-900 text-white border-zinc-800 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-zinc-100">Disparar Notificação</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {SAMPLE_NOTIFICATIONS.map((notif, idx) => (
              <button
                key={idx}
                className="w-full text-left p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-start gap-3 group"
                onClick={() => triggerNotification(notif)}
              >
                <div className="bg-white/10 p-2 rounded-full">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-300">{notif.app}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{notif.text}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* System Notification Overlay (The "Detected" Screen) */}
      {showConfirmation && activeNotification && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white dark:bg-zinc-900 border-none shadow-2xl animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Bell className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Nova transação detectada</span>
              </div>

              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-1">{activeNotification.merchant}</p>
                <h2 className={cn(
                  "text-3xl font-bold tracking-tight",
                  activeNotification.type === 'expense' ? "text-red-600" : "text-green-600"
                )}>
                  R$ {activeNotification.amount.toFixed(2).replace('.', ',')}
                </h2>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                    {activeNotification.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full text-xs font-medium text-orange-700 dark:text-orange-400">
                    {activeNotification.type === 'income' ? 'Vendas' : 'Alimentação'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 border-gray-200 dark:border-zinc-700"
                  onClick={() => setShowConfirmation(false)}
                >
                  Ignorar
                </Button>
                <Button 
                  className="h-12 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                  onClick={handleConfirm}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
              
              <button className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Editar detalhes antes de salvar
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
