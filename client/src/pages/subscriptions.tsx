import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Flame, Snowflake, ChevronDown, ChevronUp, ExternalLink, Zap, Clock, Hourglass, Bell, AlertCircle, Brain, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useFinancialStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function Subscriptions() {
    const subscriptions = useFinancialStore((state) => state.subscriptions || []);
    const updateSubscription = useFinancialStore((state) => state.updateSubscription);
    const removeSubscription = useFinancialStore((state) => state.removeSubscription);
    const resetSubscriptions = useFinancialStore((state) => state.resetSubscriptions);
    
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const totalMonthly = subscriptions.reduce((acc, sub) => acc + sub.price, 0);
    const frozenCount = subscriptions.filter(s => s.usage === 'low').length;
    const potentialSavings = subscriptions.filter(s => s.usage === 'low').reduce((acc, s) => acc + s.price, 0);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };
    
    const handleRemove = (id: string, name: string) => {
        removeSubscription(id);
        toast({
            title: "Assinatura removida",
            description: `${name} foi removido do seu clube.`
        });
    };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-black pb-20">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-zinc-900 px-6 pt-6 pb-8 rounded-b-[2.5rem] shadow-sm z-10 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="-ml-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </Button>
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Clube de Assinaturas</h1>
            </div>
            
            {subscriptions.length > 0 && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                    onClick={() => {
                        if (confirm("Tem certeza que deseja zerar todas as assinaturas?")) {
                            resetSubscriptions();
                            toast({ title: "Todas as assinaturas foram removidas." });
                        }
                    }}
                >
                    Zerar Tudo
                </Button>
            )}
          </div>

          <div className="text-center">
             <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wide">Gasto Mensal Recorrente</p>
             <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight" data-testid="text-subscriptions-totalmonthly">
                {formatCurrency(totalMonthly)}
             </h2>
             <p className="text-xs text-gray-400 mt-2">
                {subscriptions.length} servi\u00e7os ativos \u2022 projetado at\u00e9 cancelar
             </p>
          </div>
        </div>

        <div className="px-6 -mt-6 relative z-20 space-y-6">
            
            {/* Free Trial Sentinel - Filtered from subscriptions with isTrial flag */}
            {subscriptions.filter(s => s.isTrial).length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2">
                         <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1.5 rounded-full animate-pulse">
                            <Hourglass className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                         </div>
                         <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sentinela de Testes Grátis</h3>
                    </div>

                    {subscriptions.filter(s => s.isTrial).map(trial => {
                        // Determine urgency based on trialDays (mocked calculation for now since we don't have expiration date stored)
                        const daysLeft = trial.trialDays || 0;
                        const isUrgent = daysLeft <= 1;
                        
                        return (
                            <div key={trial.id} className={cn(
                                "bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border relative overflow-hidden",
                                isUrgent ? "border-red-200 dark:border-red-900/50 ring-1 ring-red-100 dark:ring-red-900/30" : "border-gray-100 dark:border-zinc-800"
                            )}>
                                {/* Status Badge */}
                                <div className={cn(
                                    "absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider",
                                    isUrgent ? "bg-red-500 text-white" : "bg-green-500 text-white"
                                )}>
                                    {isUrgent ? 'Cobra em breve!' : 'Teste Grátis'}
                                </div>

                                <div className="flex gap-4">
                                     {/* Logo */}
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm shrink-0 overflow-hidden p-2 mt-1", trial.color)}>
                                        {trial.logo ? (
                                            <img src={trial.logo} alt={trial.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-white">{trial.name[0]}</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-start pr-12">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate">{trial.name}</h4>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                                            <Clock className="w-3 h-3" />
                                            {isUrgent ? (
                                                <span className="text-red-600 font-bold animate-pulse">Cobra em breve</span>
                                            ) : (
                                                <span>Restam {daysLeft} dias</span>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Valor futuro: <span className="text-gray-900 dark:text-white font-semibold">{formatCurrency(trial.futurePrice || trial.price)}/mês</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 mb-3">
                                    <div className="flex justify-between text-[10px] mb-1.5 font-medium">
                                        <span className="text-gray-400">Início</span>
                                        <span className={isUrgent ? "text-red-500" : "text-green-500"}>
                                            {isUrgent ? 'Vence Amanhã' : 'Vence em breve'}
                                        </span>
                                    </div>
                                    <Progress value={90} className="h-2" indicatorClassName={isUrgent ? "bg-red-500" : "bg-green-500"} />
                                </div>

                                {/* AI Insight & Action */}
                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <div className="flex-1"></div>
                                    
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleRemove(trial.id, trial.name)}
                                        className={cn(
                                            "rounded-full text-xs h-8 px-4 border-none shadow-sm",
                                            isUrgent ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        Cancelar Agora
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* AI Insights Card */}
            {frozenCount > 0 && (
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
            )}

            {/* Subscriptions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Seus Serviços</h3>
                    <Button variant="ghost" size="sm" className="text-xs text-purple-600 h-8 px-2">Ver todos</Button>
                </div>

                {subscriptions.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                        <p className="text-gray-500">Nenhuma assinatura cadastrada.</p>
                        <p className="text-xs text-gray-400 mt-1">Toque em + para adicionar.</p>
                    </div>
                ) : (
                    subscriptions.filter(s => !s.isTrial).map((sub) => {
                        const isExpanded = expandedId === sub.id;
                        const isFrozen = sub.usage === 'low';
                        const subDay = Math.max(1, Math.min(31, Number(sub.date) || 1));

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
                                        {sub.logo ? (
                                            <img src={sub.logo} alt={sub.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-white uppercase">{sub.name[0]}</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate pr-2">{sub.name}</h4>
                                            <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(sub.price)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500" data-testid={`text-subscription-dueday-${sub.id}`}>Vence dia</span>
                                                <input
                                                    data-testid={`input-subscription-dueday-${sub.id}`}
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    value={subDay}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const next = Math.max(1, Math.min(31, Number(e.target.value) || 1));
                                                        updateSubscription(sub.id, { date: String(next) });
                                                    }}
                                                    className="w-[52px] h-6 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-semibold text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:ring-purple-900/40"
                                                />
                                                {isFrozen ? (
                                                    <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                        <Snowflake className="w-3 h-3" />
                                                        {sub.usageLabel || "Pouco uso"}
                                                    </div>
                                                ) : sub.usage === 'high' ? (
                                                    <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                                        <Flame className="w-3 h-3" />
                                                        {sub.usageLabel || "Uso Intenso"}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">{sub.usageLabel || "Uso Normal"}</span>
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
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{sub.lastUsed || "N/A"}</span>
                                        </div>
                                        
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => handleRemove(sub.id, sub.name)}
                                            className="w-full rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/30 h-10 font-semibold text-xs border border-red-100 dark:border-red-900/30"
                                        >
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Remover Assinatura
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Discovery Section (Bottom) */}
            <div className="pt-4 pb-8 space-y-4">
                <Link href="/add-subscription">
                    <Card className="p-4 border-dashed border-2 border-gray-200 dark:border-zinc-800 bg-transparent flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                            <PlusIcon className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Adicionar Assinatura Manualmente</p>
                    </Card>
                </Link>

                {/* Simulated Notification Preview */}
                <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-3 opacity-60 hover:opacity-100 transition-opacity cursor-default select-none scale-90 origin-bottom">
                     <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center text-[8px] text-white font-bold">X</div>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Xô Preguiça • Agora</span>
                     </div>
                     <h4 className="font-bold text-sm text-gray-900 dark:text-white">⚠️ Alerta de Cobrança Amanhã</h4>
                     <p className="text-xs text-gray-600 dark:text-gray-400">Seu teste da Disney+ vence amanhã. Toque para cancelar agora e economizar {formatCurrency(33.90)}.</p>
                </div>
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
