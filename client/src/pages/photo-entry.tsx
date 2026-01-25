import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, Upload, Image as ImageIcon } from "lucide-react";
import { useFinancialStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function PhotoEntry() {
  const [_, setLocation] = useLocation();
  const addTransaction = useFinancialStore((state) => state.addTransaction);
  const addCreditPurchase = useFinancialStore((state) => state.addCreditPurchase);
  const accounts = useFinancialStore((state) => state.accounts);
  const creditCards = useFinancialStore((state) => state.creditCards);

  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrData, setOcrData] = useState<{ amount: number; description: string } | null>(null);

  // Payment Method Selection
  const [paymentType, setPaymentType] = useState<"debit" | "credit">("debit");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  useEffect(() => {
    // Default selection
    if (paymentType === "debit" && accounts.length > 0) setSelectedSourceId(accounts[0].id);
    if (paymentType === "credit" && creditCards.length > 0) setSelectedSourceId(creditCards[0].id);
  }, [paymentType, accounts, creditCards]);

  const handleCapture = () => {
    // Mock capture
    setImage("https://placehold.co/400x600/e2e8f0/475569?text=Recibo+Capturado");
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setOcrData({ amount: 124.90, description: "Supermercado XYZ" });
    }, 2000);
  };

  const handleSave = () => {
      if (ocrData && selectedSourceId) {
          if (paymentType === "credit") {
              addCreditPurchase({
                  creditCardId: selectedSourceId,
                  description: ocrData.description,
                  totalAmount: ocrData.amount,
                  installments: 1, 
                  installmentValue: ocrData.amount,
                  category: "Alimentação", // Mock
                  purchaseDate: new Date().toISOString()
              });
              toast({
                  title: "Recibo de Cartão Salvo!",
                  description: `Despesa de R$ ${ocrData.amount.toFixed(2)} registrada.`,
              });
          } else {
              addTransaction({
                  amount: ocrData.amount,
                  type: "expense",
                  category: "Alimentação", // Mock categorization
                  description: ocrData.description,
                  source: "photo",
                  isPersonal: true,
                  accountId: selectedSourceId
              });
              toast({
                  title: "Recibo salvo!",
                  description: `Despesa de R$ ${ocrData.amount.toFixed(2)} registrada.`,
              });
          }
          setLocation("/dashboard");
      }
  };

  return (
    <MobileLayout>
      <div className="flex-1 bg-black relative flex flex-col">
        {/* Overlay Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 text-white">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="text-white hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
          <span className="font-medium text-sm opacity-90">Digitalizar Recibo</span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Upload className="w-6 h-6" />
          </Button>
        </div>

        {/* Viewfinder / Image Display */}
        <div className="flex-1 relative bg-zinc-900 overflow-hidden">
          {image ? (
            <div className="relative w-full h-full">
                <img src={image} alt="Captured" className="w-full h-full object-cover opacity-80" />
                {ocrData && !processing && (
                    <div className="absolute bottom-40 left-0 right-0 flex justify-center z-30 pointer-events-none">
                         <div className="bg-white text-black px-4 py-2 rounded-full shadow-lg animate-in slide-in-from-bottom-5">
                            <p className="font-bold text-sm">Detectado: R$ {ocrData.amount.toFixed(2)}</p>
                         </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-zinc-500 text-sm">Preview da Câmera</p>
              <div className="absolute inset-12 border-2 border-white/20 rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="bg-black p-8 pb-12 flex flex-col justify-center items-center gap-6 z-20">
          {image && !processing && ocrData ? (
             <div className="w-full space-y-4 animate-in slide-in-from-bottom-5">
                {/* Method Selection */}
                <div className="bg-zinc-900 p-4 rounded-xl space-y-3">
                    <div className="flex gap-2 justify-center bg-zinc-800 p-1 rounded-lg">
                        <button 
                            className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", paymentType === "debit" ? "bg-white text-black shadow-sm" : "text-gray-400")}
                            onClick={() => setPaymentType("debit")}
                        >
                            Débito
                        </button>
                        <button 
                            className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", paymentType === "credit" ? "bg-white text-black shadow-sm" : "text-gray-400")}
                            onClick={() => setPaymentType("credit")}
                        >
                            Crédito
                        </button>
                    </div>

                    <div className="space-y-1 text-left">
                        <Label className="text-xs text-gray-500">
                            {paymentType === "credit" ? "Cartão" : "Conta"}
                        </Label>
                        <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                            <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                {paymentType === "credit" ? (
                                    creditCards.map(card => (
                                        <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                                    ))
                                ) : (
                                    accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-4 w-full">
                    <Button variant="outline" className="flex-1 h-12 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-white" onClick={() => setImage(null)}>
                        Retirar
                    </Button>
                    <Button className="flex-1 h-12 bg-primary text-white hover:bg-primary/90" onClick={handleSave}>
                        <Check className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                </div>
             </div>
          ) : image && processing ? (
              <div className="flex flex-col items-center gap-4 text-white">
                 <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                 <p className="text-xs">Lendo dados...</p>
              </div>
          ) : (
            <div className="flex justify-center items-center gap-8">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                <ImageIcon className="w-6 h-6" />
              </Button>
              
              <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center p-1"
              >
                <div className="w-full h-full bg-white rounded-full hover:scale-95 transition-transform" />
              </button>
              
              <div className="w-10" /> {/* Spacer */}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
