import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/mobile-layout";
import heroImage from "@/assets/sloth-hero.jpg";

export default function Onboarding() {
  const [_, setLocation] = useLocation();

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-black">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 space-y-8 animate-in fade-in duration-1000">
          <div className="relative w-full aspect-square max-w-[280px]">
            <img 
              src={heroImage} 
              alt="Xô Preguiça" 
              className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 rounded-3xl"
            />
          </div>
          
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Xô Preguiça <br />
              <span className="text-2xl text-gray-500 font-normal">Orçamento Pessoal</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
              Controle sua vida financeira sem planilhas. Registre gastos por voz, foto ou automaticamente.
            </p>
          </div>
        </div>

        <div className="p-8 z-10 space-y-4 animate-in slide-in-from-bottom-12 duration-1000 delay-300">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-medium rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1"
            onClick={() => setLocation("/permissions")}
          >
            Começar Agora
          </Button>
          
          <div className="flex justify-center items-center space-x-2 text-sm text-gray-400 pt-2">
            <span>Para:</span>
            <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">Você</span>
            <span>&</span>
            <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">Seu Negócio</span>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
