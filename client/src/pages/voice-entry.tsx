import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Mic, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VoiceEntry() {
  const [_, setLocation] = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [stage, setStage] = useState<"idle" | "listening" | "processing" | "confirm">("idle");

  const startListening = () => {
    setStage("listening");
    setIsListening(true);
    // Mock listening duration
    setTimeout(() => {
      setIsListening(false);
      setStage("processing");
      setTimeout(() => {
        setTranscript("Gastei 45 reais na Padaria Estrela");
        setStage("confirm");
      }, 1500);
    }, 3000);
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
                "Recebi 2000 do freela"
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
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Alimentação</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">R$ 45,00</span>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStage("idle")}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-12 bg-primary hover:bg-primary/90" onClick={() => setLocation("/dashboard")}>
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
