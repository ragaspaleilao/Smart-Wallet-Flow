import { useState } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Flame, Snowflake, ChevronDown, ChevronUp, ExternalLink, Zap } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Mock Data for Subscriptions
const SUBSCRIPTIONS = [
  {
    id: 1,
    name: "Netflix Premium",
    price: 55.90,
    date: "15/05",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/75/Netflix_icon.svg",
    color: "bg-black",
    usage: "high", // high, medium, low
    usageLabel: "Uso Intenso",
    lastUsed: "Ontem",
    category: "Streaming"
  },
  {
    id: 2,
    name: "Spotify Duo",
    price: 27.90,
    date: "10/05",
    logo: "https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg",
    color: "bg-white",
    usage: "high",
    usageLabel: "Uso Intenso",
    lastUsed: "Hoje",
    category: "Música"
  },
  {
    id: 3,
    name: "Adobe Creative Cloud",
    price: 124.00,
    date: "22/05",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Adobe_Creative_Cloud_Rainbow_Icon.svg",
    color: "bg-[#0b0c22]",
    usage: "low",
    usageLabel: "Sem uso recente",
    lastUsed: "45 dias atrás",
    category: "Software"
  },
  {
    id: 4,
    name: "Amazon Prime",
    price: 19.90,
    date: "05/05",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg",
    color: "bg-white",
    usage: "medium",
    usageLabel: "Uso Moderado",
    lastUsed: "5 dias atrás",
    category: "Shopping"
  },
  {
    id: 5,
    name: "HBO Max",
    price: 34.90,
    date: "28/05",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg",
    color: "bg-[#240e3f]",
    usage: "low",
    usageLabel: "Sem uso recente",
    lastUsed: "32 dias atrás",
    category: "Streaming"
  }
];

export default function Subscriptions() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalMonthly = SUBSCRIPTIONS.reduce((acc, sub) => acc + sub.price, 0);
  const frozenCount = SUBSCRIPTIONS.filter(s => s.usage === 'low').length;
  const potentialSavings = SUBSCRIPTIONS.filter(s => s.usage === 'low').reduce((acc, s) => acc + s.price, 0);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-black pb-20">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-zinc-900 px-6 pt-6 pb-8 rounded-b-[2.5rem] shadow-sm z-10 relative">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Clube de Assinaturas</h1>
          </div>

          <div className="text-center">
             <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wide">Gasto Mensal Recorrente</p>
             <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(totalMonthly)}
             </h2>
             <p className="text-xs text-gray-400 mt-2">
                {SUBSCRIPTIONS.length} serviços ativos
             </p>
          </div>
        </div>

        <div className="px-6 -mt-6 relative z-20 space-y-6">
            
            {/* AI Insights Card */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-100 to-indigo-50 dark:from-purple-900/40 dark:to-indigo-900/20 overflow-hidden">
                <div className="p-5 relative">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-bl-full -mr-4 -mt-4" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-200/20 dark:bg-purple-500/10 rounded-tr-full -ml-4 -mb-4" />
                    
                    <div className="flex items-start gap-3 relative z-10">
                        <div className="bg-white/80 dark:bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-sm">
                            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-300 fill-current" />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-900 dark:text-purple-100 text-sm mb-1">Insights do Mentor</h3>
                            <p className="text-xs text-purple-800/80 dark:text-purple-200/80 leading-relaxed">
                                Você tem <span className="font-bold">{frozenCount} assinaturas</span> que não usa há mais de 30 dias. 
                                <br/>
                                Economia potencial: <span className="font-bold text-purple-700 dark:text-purple-200 bg-purple-200/50 dark:bg-purple-500/30 px-1 rounded">{formatCurrency(potentialSavings)}/mês</span>
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Subscriptions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Seus Serviços</h3>
                    <Button variant="ghost" size="sm" className="text-xs text-purple-600 h-8 px-2">Ver todos</Button>
                </div>

                {SUBSCRIPTIONS.map((sub) => {
                    const isExpanded = expandedId === sub.id;
                    const isFrozen = sub.usage === 'low';

                    return (
                        <div 
                            key={sub.id}
                            className={cn(
                                "bg-white dark:bg-zinc-900 rounded-3xl transition-all duration-300 overflow-hidden border border-transparent",
                                isExpanded ? "shadow-xl ring-1 ring-purple-100 dark:ring-purple-900/30 scale-[1.02]" : "shadow-sm hover:shadow-md"
                            )}
                        >
                            {/* Card Header (Main View) */}
                            <div 
                                className="p-4 flex items-center gap-4 cursor-pointer"
                                onClick={() => toggleExpand(sub.id)}
                            >
                                {/* Logo */}
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0 overflow-hidden p-2", sub.color)}>
                                    <img src={sub.logo} alt={sub.name} className="w-full h-full object-contain" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate pr-2">{sub.name}</h4>
                                        <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(sub.price)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500">Vence dia {sub.date}</span>
                                            {isFrozen ? (
                                                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                    <Snowflake className="w-3 h-3" />
                                                    {sub.usageLabel}
                                                </div>
                                            ) : sub.usage === 'high' ? (
                                                <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                                    <Flame className="w-3 h-3" />
                                                    {sub.usageLabel}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">{sub.usageLabel}</span>
                                            )}
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <div className={cn(
                                "bg-gray-50/50 dark:bg-zinc-800/30 overflow-hidden transition-all duration-300 ease-in-out",
                                isExpanded ? "max-h-48 border-t border-gray-100 dark:border-zinc-800" : "max-h-0"
                            )}>
                                <div className="p-4 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Custo Anual</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(sub.price * 12)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Último uso detectado</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{sub.lastUsed}</span>
                                    </div>
                                    
                                    {isFrozen ? (
                                        <Button 
                                            variant="destructive" 
                                            className="w-full rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border-none shadow-none h-10 font-semibold text-xs"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-2" />
                                            Como Cancelar Assinatura
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outline" 
                                            className="w-full rounded-xl border-gray-200 dark:border-zinc-700 text-gray-500 h-10 text-xs"
                                        >
                                            Ver Detalhes do Plano
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Discovery Section (Bottom) */}
            <div className="pt-4 pb-8">
                <Link href="/add-subscription">
                    <Card className="p-4 border-dashed border-2 border-gray-200 dark:border-zinc-800 bg-transparent flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                            <PlusIcon className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Adicionar Assinatura Manualmente</p>
                    </Card>
                </Link>
            </div>
        </div>
      </div>
    </MobileLayout>
  );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    )
}
