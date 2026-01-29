import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useFinancialStore, Category } from "@/lib/store";
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, RefreshCw, Settings2, Trash2, AlertTriangle, Lock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function CalendarIntegration() {
  const { calendarSettings, calendarEvents, updateCalendarSettings, connectCalendar, disconnectCalendar } = useFinancialStore();

  const handleConnect = () => {
    // Simulate OAuth flow
    toast({ title: "Conectando ao Google Agenda...", description: "Aguarde um momento." });
    setTimeout(() => {
        connectCalendar();
        toast({ title: "Conectado com sucesso!", description: "Seus eventos estão sendo sincronizados." });
    }, 1500);
  };

  const handleDisconnect = () => {
    if (confirm("Tem certeza que deseja desconectar? Isso removerá a sincronização futura.")) {
        disconnectCalendar();
        toast({ title: "Desconectado", description: "A integração com o Google Agenda foi removida." });
    }
  };

  const toggleCategory = (category: Category) => {
    const current = calendarSettings.syncCategories;
    if (current.includes(category)) {
        updateCalendarSettings({ syncCategories: current.filter(c => c !== category) });
    } else {
        updateCalendarSettings({ syncCategories: [...current, category] });
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="bg-white dark:bg-zinc-950 min-h-screen pb-20">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white pb-12 rounded-b-3xl relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold">Agenda Financeira</h1>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Google Agenda</h2>
                    <p className="text-blue-100 text-sm max-w-[280px]">
                        Sincronize suas contas e vencimentos automaticamente com seu calendário.
                    </p>
                </div>
            </div>
        </div>

        <div className="px-6 -mt-8 relative z-20 space-y-6">
            
            {/* Connection Status Card */}
            <Card className="p-5 border-none shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${calendarSettings.isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {calendarSettings.isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                    </div>
                    {calendarSettings.isConnected && (
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                            Sincronizando
                        </Badge>
                    )}
                </div>

                {!calendarSettings.isConnected ? (
                    <Button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 text-base font-semibold">
                        <Calendar className="w-5 h-5" />
                        Conectar Google Agenda
                    </Button>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">
                                    G
                                </div>
                                <div className="text-sm">
                                    <p className="font-bold text-gray-900 dark:text-white">joao.silva@gmail.com</p>
                                    <p className="text-gray-500 text-xs">Conta principal</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" onClick={handleDisconnect} className="text-red-500 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                             </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <Label className="text-gray-600">Sincronização Automática</Label>
                            <Switch 
                                checked={calendarSettings.isEnabled} 
                                onCheckedChange={(c) => updateCalendarSettings({ isEnabled: c })} 
                            />
                        </div>
                    </div>
                )}
            </Card>

            {calendarSettings.isConnected && (
                <>
                    {/* Settings Section */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-gray-500" />
                            Configurações
                        </h3>

                        <Card className="p-4 border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Lembretes</Label>
                                    <Select 
                                        value={calendarSettings.reminderDaysBefore.toString()} 
                                        onValueChange={(v) => updateCalendarSettings({ reminderDaysBefore: parseInt(v) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 dia antes</SelectItem>
                                            <SelectItem value="2">2 dias antes</SelectItem>
                                            <SelectItem value="3">3 dias antes</SelectItem>
                                            <SelectItem value="7">1 semana antes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Categorias para Sincronizar</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {useFinancialStore.getState().categories.map((cat) => (
                                            <Badge 
                                                key={cat}
                                                variant={calendarSettings.syncCategories.includes(cat as Category) ? "default" : "outline"}
                                                className={`cursor-pointer ${calendarSettings.syncCategories.includes(cat as Category) ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100'}`}
                                                onClick={() => toggleCategory(cat as Category)}
                                                data-testid={`badge-sync-category-${cat}`}
                                            >
                                                {cat}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Events List */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-gray-500" />
                            Eventos Sincronizados
                        </h3>

                        <div className="space-y-3">
                            {calendarEvents.length === 0 ? (
                                <p className="text-center text-gray-500 py-4 text-sm">Nenhum evento futuro encontrado.</p>
                            ) : (
                                calendarEvents.map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-zinc-800 text-gray-500`}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">{event.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(event.date), "dd/MM • HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-bold text-sm ${event.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                                {event.type === 'income' ? '+' : '-'} R$ {event.amount.toFixed(2)}
                                            </span>
                                            <div className="flex justify-end mt-1">
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-green-200 text-green-700 bg-green-50 flex items-center gap-1">
                                                    <CheckCircle2 className="w-2 h-2" />
                                                    Sincronizado
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
                <Lock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
                    <span className="font-bold">Privacidade:</span> Nós apenas adicionamos eventos ao seu calendário. Não lemos ou acessamos seus outros compromissos pessoais.
                </p>
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}
