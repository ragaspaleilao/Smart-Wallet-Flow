import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getUserId } from "@/lib/api";
import { useCalendarSettings, useUpdateCalendarSettings } from "@/hooks/use-api";

const categories = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 
  'Lazer', 'Compras', 'Serviços', 'Outros'
];

export default function CalendarIntegration() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [syncCreditCards, setSyncCreditCards] = useState(true);
  const [syncTransactions, setSyncTransactions] = useState(true);

  const { data: savedSettings } = useCalendarSettings();
  const updateSettings = useUpdateCalendarSettings();

  // Load persisted settings once
  useEffect(() => {
    if (savedSettings) {
      if (Array.isArray(savedSettings.syncCategories)) {
        setSelectedCategories(savedSettings.syncCategories);
      }
    }
  }, [savedSettings?.id]);

  const persistSettings = (overrides?: { isEnabled?: boolean; isConnected?: boolean; syncCategories?: string[]; reminderDaysBefore?: number }) => {
    updateSettings.mutate({
      isEnabled: overrides?.isEnabled ?? syncTransactions,
      isConnected: overrides?.isConnected ?? false,
      syncCategories: overrides?.syncCategories ?? selectedCategories,
      reminderDaysBefore: overrides?.reminderDaysBefore ?? savedSettings?.reminderDaysBefore ?? 1,
    });
  };

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const userId = getUserId();
      const res = await fetch('/api/calendar/status', {
        headers: { 'x-user-id': userId || '' }
      });
      return res.json();
    },
  });

  const { data: calendars = [], isLoading: calendarsLoading } = useQuery({
    queryKey: ['calendar-list'],
    queryFn: async () => {
      const userId = getUserId();
      const res = await fetch('/api/calendar/calendars', {
        headers: { 'x-user-id': userId || '' }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: status?.isConnected,
  });

  const syncTransactionsMutation = useMutation({
    mutationFn: async () => {
      const userId = getUserId();
      const res = await fetch('/api/calendar/sync-transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId || '' 
        },
        body: JSON.stringify({
          calendarId: selectedCalendarId,
          categories: selectedCategories,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Transações sincronizadas!", 
        description: `${data.synced} eventos criados no seu calendário.` 
      });
    },
    onError: () => {
      toast({ 
        title: "Erro ao sincronizar", 
        variant: "destructive" 
      });
    },
  });

  const syncCreditCardsMutation = useMutation({
    mutationFn: async () => {
      const userId = getUserId();
      const res = await fetch('/api/calendar/sync-credit-cards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId || '' 
        },
        body: JSON.stringify({
          calendarId: selectedCalendarId,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Cartões sincronizados!", 
        description: `${data.synced} vencimentos adicionados ao calendário.` 
      });
    },
    onError: () => {
      toast({ 
        title: "Erro ao sincronizar cartões", 
        variant: "destructive" 
      });
    },
  });

  const handleSync = async () => {
    if (syncTransactions) {
      await syncTransactionsMutation.mutateAsync();
    }
    if (syncCreditCards) {
      await syncCreditCardsMutation.mutateAsync();
    }
  };

  const toggleCategory = (category: string) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(next);
    persistSettings({ syncCategories: next, isConnected: !!status?.isConnected });
  };

  const handleToggleTransactions = (v: boolean) => {
    setSyncTransactions(v);
    persistSettings({ isEnabled: v, isConnected: !!status?.isConnected });
  };

  const isSyncing = syncTransactionsMutation.isPending || syncCreditCardsMutation.isPending;

  return (
    <MobileLayout showNav={false}>
      <div className="bg-white dark:bg-zinc-950 min-h-screen pb-20">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white pb-12 rounded-b-3xl relative overflow-hidden">
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
                {statusLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <div className={`w-3 h-3 rounded-full ${status?.isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusLoading ? 'Verificando...' : status?.isConnected ? 'Conectado' : 'Não conectado'}
                </span>
              </div>
              {status?.isConnected && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              )}
            </div>

            {status?.isConnected && status?.email && (
              <p className="text-sm text-gray-500 mb-4">
                Conta: {status.email}
              </p>
            )}

            {!status?.isConnected && !statusLoading && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Conexão necessária</p>
                    <p>A integração com Google Calendar precisa ser configurada pelo administrador do app.</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {status?.isConnected && (
            <>
              {/* Calendar Selection */}
              <Card className="p-5 border-none shadow-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Calendário</h3>
                
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Calendário Principal</SelectItem>
                    {calendars.map((cal: any) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>

              {/* Sync Options */}
              <Card className="p-5 border-none shadow-lg space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">O que sincronizar</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Transações Futuras</p>
                      <p className="text-xs text-gray-500">Despesas e receitas programadas</p>
                    </div>
                  </div>
                  <Switch checked={syncTransactions} onCheckedChange={handleToggleTransactions} data-testid="switch-sync-transactions" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Vencimentos de Cartão</p>
                      <p className="text-xs text-gray-500">Próximos 6 meses</p>
                    </div>
                  </div>
                  <Switch checked={syncCreditCards} onCheckedChange={setSyncCreditCards} />
                </div>
              </Card>

              {/* Categories */}
              {syncTransactions && (
                <Card className="p-5 border-none shadow-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Categorias a sincronizar</h3>
                  <p className="text-xs text-gray-500 mb-3">Deixe vazio para sincronizar todas</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedCategories.includes(category)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Sync Button */}
              <Button 
                onClick={handleSync}
                disabled={isSyncing || (!syncTransactions && !syncCreditCards)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Sincronizar com Google Agenda
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Os eventos serão criados no calendário selecionado com lembretes automáticos.
              </p>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
