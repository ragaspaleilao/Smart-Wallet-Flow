import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Mic, X, Check, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function VoiceEntry() {
  const [_, setLocation] = useLocation();
  const addTransaction = useFinancialStore((state) => state.addTransaction);
  const addCreditPurchase = useFinancialStore((state) => state.addCreditPurchase);
  const accounts = useFinancialStore((state) => state.accounts);
  const creditCards = useFinancialStore((state) => state.creditCards);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [stage, setStage] = useState<"idle" | "listening" | "processing" | "confirm">("idle");
  const [parsedData, setParsedData] = useState<{ amount: number; description: string; category: any } | null>(null);
  
  // Payment Method Selection
  const [paymentType, setPaymentType] = useState<"debit" | "credit">("debit");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  useEffect(() => {
    // Default selection
    if (paymentType === "debit" && accounts.length > 0) setSelectedSourceId(accounts[0].id);
    if (paymentType === "credit" && creditCards.length > 0) setSelectedSourceId(creditCards[0].id);
  }, [paymentType, accounts, creditCards]);

  const startListening = () => {
    setStage("listening");
    setIsListening(true);
    // Mock listening duration
    setTimeout(() => {
      setIsListening(false);
      setStage("processing");
      setTimeout(() => {
        const mockText = "Gastei 45 reais na Padaria Estrela";
        setTranscript(mockText);
        setParsedData({
            amount: 45.00,
            description: "Padaria Estrela",
            category: "Alimentação"
        });
        
        // Auto-detect credit card context (mock)
        if (mockText.toLowerCase().includes("cartão") || mockText.toLowerCase().includes("crédito")) {
            setPaymentType("credit");
        } else {
            setPaymentType("debit");
        }

        setStage("confirm");
      }, 1500);
    }, 3000);
  };

  const handleConfirm = () => {
    if (parsedData && selectedSourceId) {
        if (paymentType === "credit") {
            addCreditPurchase({
                creditCardId: selectedSourceId,
                description: parsedData.description,
                totalAmount: parsedData.amount,
                installments: 1, // Default to 1x for voice for now
                installmentValue: parsedData.amount,
                category: parsedData.category,
                purchaseDate: new Date().toISOString()
            });
            toast({
                title: "Compra no Cartão salva!",
                description: `Despesa de R$ ${parsedData.amount.toFixed(2)} registrada.`,
            });
        } else {
            addTransaction({
                amount: parsedData.amount,
                type: "expense",
                category: parsedData.category,
                description: parsedData.description,
                source: "voice",
                isPersonal: true,
                accountId: selectedSourceId,
                date: new Date().toISOString()
            });
            toast({
                title: "Salvo com sucesso!",
                description: `Despesa de R$ ${parsedData.amount.toFixed(2)} registrada.`,
            });
        }
        setLocation("/dashboard");
    } else {
        toast({ title: "Selecione a conta ou cartão", variant: "destructive" });
    }
  };

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col items-center justify-between p-8 bg-white dark:bg-black relative overflow-hidden">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center z-10">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <X className="w-6 h-6" />
          </Button>
          <span className="font-medium text-sm text-gray-500">Registro por Voz</span>
          <div className="w-10" /> 
        </div>

        {/* Central Interaction */}
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
          {stage === "idle" && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Toque para falar
              </h2>
              <p className="text-gray-500 max-w-[200px] mx-auto">
                "Gastei 50 reais no almoço"
                <br />
                "Compra de 200 reais no cartão"
              </p>
              <button 
                onClick={startListening}
                className="w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-105 transition-transform"
              >
                <Mic className="w-12 h-12" />
              </button>
            </div>
          )}

          {stage === "listening" && (
            <div className="text-center space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ouvindo...
              </h2>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="absolute inset-2 bg-primary/40 rounded-full animate-ping delay-75" />
                <div className="relative w-full h-full rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30">
                  <Mic className="w-12 h-12" />
                </div>
              </div>
            </div>
          )}

          {stage === "processing" && (
            <div className="text-center space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white animate-pulse">
                Processando...
              </h2>
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {stage === "confirm" && (
            <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-bottom-8">
              <div className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 text-center space-y-4">
                <p className="text-sm text-gray-500">Entendi que:</p>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">"{transcript}"</h3>
                <div className="flex justify-center gap-2">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">{parsedData?.category}</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">R$ {parsedData?.amount.toFixed(2)}</span>
                </div>
                
                {/* Source Selection */}
                <div className="pt-4 border-t border-gray-200 dark:border-zinc-700 space-y-3">
                    <div className="flex gap-2 justify-center bg-gray-200 dark:bg-zinc-800 p-1 rounded-lg">
                        <button 
                            className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", paymentType === "debit" ? "bg-white text-black shadow-sm" : "text-gray-500")}
                            onClick={() => setPaymentType("debit")}
                        >
                            Débito / Conta
                        </button>
                        <button 
                            className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", paymentType === "credit" ? "bg-white text-black shadow-sm" : "text-gray-500")}
                            onClick={() => setPaymentType("credit")}
                        >
                            Crédito
                        </button>
                    </div>

                    <div className="space-y-1 text-left">
                        <Label className="text-xs text-gray-500">
                            {paymentType === "credit" ? "Selecione o Cartão" : "Selecione a Conta"}
                        </Label>
                        <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                            <SelectTrigger className="h-9 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentType === "credit" ? (
                                    creditCards.map(card => (
                                        <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                                    ))
                                ) : (
                                    accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStage("idle")}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-12 bg-primary hover:bg-primary/90" onClick={handleConfirm}>
                  <Check className="w-4 h-4 mr-2" /> Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
