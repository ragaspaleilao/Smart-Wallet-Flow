import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Moon, HelpCircle, LogOut, Car, Shield, CreditCard, ChevronRight, Wallet, Crown, Gift, Cloud, Calendar, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ShareButton } from "@/components/share-button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { getUserId } from "@/lib/api";

export default function Settings() { 
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isDark, setDarkMode } = useTheme();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const userId = getUserId();
      if (!userId) throw new Error('Não autenticado');
      
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Falha ao zerar dados');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: 'Dados zerados!',
        description: 'Todos os dados foram apagados. Uma conta padrão foi criada.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível zerar os dados. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleReset = () => {
    resetMutation.mutate();
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-white dark:bg-black">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white pt-6 mb-8">Ajustes</h1>

        <div className="space-y-8">
          {/* Profile Section */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-zinc-800">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Perfil" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold" data-testid="text-user-name">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuário' : 'Carregando...'}
              </h2>
              <p className="text-sm text-gray-500" data-testid="text-user-email">{user?.email || ''}</p>
            </div>
          </div>
          
             <Link href="/premium">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-xl text-white shadow-lg shadow-purple-200 dark:shadow-none cursor-pointer transform transition-transform active:scale-95">
                   <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-white/20 rounded-lg">
                               <Crown className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                           </div>
                           <div>
                               <h3 className="font-bold">Seja Premium</h3>
                               <p className="text-xs text-purple-100">Desbloqueie IA e Gestão de Negócios</p>
                           </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-white/50 mt-2" />
                   </div>
                </div>
             </Link>
             
             {/* Refer and Earn Banner - NEW */}
             <Link href="/refer-and-earn">
                <div className="bg-white dark:bg-zinc-900 border border-green-100 dark:border-green-900/30 p-4 rounded-xl cursor-pointer hover:border-green-300 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Indique e Ganhe Premium</h3>
                            <p className="text-xs text-gray-500">Ganhe até 1 ano de acesso grátis</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
             </Link>

          {/* Share App Section - New */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Gostou do app?</h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Compartilhe com seus amigos e ajude eles a organizarem as finanças!</p>
            <ShareButton showText variant="default" className="w-full bg-blue-600 hover:bg-blue-700 text-white" />
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Preferências</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium">Modo Escuro</span>
              </div>
              <Switch 
                checked={isDark} 
                onCheckedChange={setDarkMode}
                data-testid="switch-dark-mode"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium">Usar Biometria</span>
              </div>
              <Switch defaultChecked />
            </div>

            <Link href="/backup">
              <div className="flex items-center justify-between py-2 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg">
                        <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium group-hover:text-blue-600 transition-colors">Backup e Segurança</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>

            <Link href="/calendar-integration">
              <div className="flex items-center justify-between py-2 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded-lg">
                        <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-orange-600 transition-colors">Agenda Financeira</span>
                            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full">PREMIUM</div>
                        </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* Modules */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Módulos</h3>
             
             <Link href="/accounts">
               <div className="flex items-center justify-between py-3 cursor-pointer group">
                 <div className="flex items-center gap-3">
                   <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                   <span className="font-medium group-hover:text-primary transition-colors">Minhas Contas</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
               </div>
             </Link>

             <Link href="/vehicles">
               <div className="flex items-center justify-between py-3 cursor-pointer group">
                 <div className="flex items-center gap-3">
                   <Car className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                   <span className="font-medium group-hover:text-primary transition-colors">Meus Veículos</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
               </div>
             </Link>

             <Link href="/budget">
               <div className="flex items-center justify-between py-3 cursor-pointer group">
                 <div className="flex items-center gap-3">
                   <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                   <span className="font-medium group-hover:text-primary transition-colors">Orçamento e Limites</span>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
               </div>
             </Link>
          </div>

          {/* Danger zone */}
          <div className="pt-6">
            <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/60 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-red-100 dark:border-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-300">Zerar dados para testes</h3>
                  <p className="text-xs text-red-700/70 dark:text-red-300/70 mt-0.5">
                    Isso apaga extrato, cartões, assinaturas, investimentos, veículos etc. e deixa apenas 1 conta padrão com saldo R$ 0,00.
                  </p>

                  <div className="mt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full"
                          data-testid="button-reset-all"
                        >
                          Zerar tudo agora
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-testid="dialog-reset-all">
                        <AlertDialogHeader>
                          <AlertDialogTitle data-testid="text-reset-title">Confirmar reset total?</AlertDialogTitle>
                          <AlertDialogDescription data-testid="text-reset-description">
                            Isso vai apagar TODOS os dados salvos neste aparelho. Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-reset">Cancelar</AlertDialogCancel>
                          <AlertDialogAction data-testid="button-confirm-reset" onClick={handleReset}>
                            Sim, zerar tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other */}
          <div className="pt-6 space-y-4">
            <Button variant="ghost" className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-primary pl-0" data-testid="button-help">
              <HelpCircle className="w-5 h-5 mr-3" />
              Ajuda e Suporte
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 pl-0" 
              data-testid="button-logout"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
