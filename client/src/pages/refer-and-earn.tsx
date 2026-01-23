import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFinancialStore } from "@/lib/store";
import { ShareButton } from "@/components/share-button";
import { ArrowLeft, CheckCircle2, Clock, Copy, Gift, Info, Star, Users } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export default function ReferAndEarn() {
  const { referralCode, referrals, premiumUntil } = useFinancialStore();
  
  const confirmedReferrals = referrals.filter(r => r.status === 'confirmed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  
  // Calculate Progress for Next Reward
  // 1 -> 7 days
  // 3 -> 30 days
  // 12 -> 1 year
  
  let currentTarget = 1;
  let nextReward = "7 dias Premium";
  let progress = 0;
  
  if (confirmedReferrals >= 1 && confirmedReferrals < 3) {
      currentTarget = 3;
      nextReward = "30 dias Premium";
      progress = ((confirmedReferrals - 1) / 2) * 100;
  } else if (confirmedReferrals >= 3 && confirmedReferrals < 12) {
      currentTarget = 12;
      nextReward = "1 Ano Premium";
      progress = ((confirmedReferrals - 3) / 9) * 100;
  } else if (confirmedReferrals >= 12) {
      currentTarget = 12;
      nextReward = "Máximo atingido!";
      progress = 100;
  } else {
      // Less than 1
      progress = (confirmedReferrals / 1) * 100;
  }

  const referralLink = `xopreguica.app/convite/${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Código copiado!" });
  };

  return (
    <MobileLayout showNav={false}>
      <div className="bg-purple-600 min-h-[30vh] p-6 text-white relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
         
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/settings">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold">Indique e Ganhe</h1>
            </div>
            
            <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <Gift className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                </div>
                <h2 className="text-2xl font-bold">Ganhe Premium Grátis</h2>
                <p className="text-purple-100 text-sm max-w-[280px] mx-auto">
                    Convide amigos para usar o app. Cada amigo ativo te dá acesso premium.
                </p>
            </div>
         </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-black -mt-6 rounded-t-3xl relative z-20 px-6 pt-8 pb-24">
        {/* Progress Card */}
        <Card className="p-5 border-none shadow-lg mb-6 bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Próxima Recompensa</p>
                    <h3 className="font-bold text-purple-600 dark:text-purple-400 text-lg">{nextReward}</h3>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{confirmedReferrals}/{currentTarget} amigos</span>
            </div>
            <Progress value={progress} className="h-3 bg-gray-100 dark:bg-zinc-800" indicatorClassName="bg-gradient-to-r from-purple-500 to-indigo-600" />
            
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="text-center">
                    <div className={`text-xs font-bold mb-1 ${confirmedReferrals >= 1 ? 'text-green-600' : 'text-gray-400'}`}>1 Amigo</div>
                    <div className="text-[10px] text-gray-500">+7 Dias</div>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-zinc-800">
                    <div className={`text-xs font-bold mb-1 ${confirmedReferrals >= 3 ? 'text-green-600' : 'text-gray-400'}`}>3 Amigos</div>
                    <div className="text-[10px] text-gray-500">+30 Dias</div>
                </div>
                <div className="text-center">
                    <div className={`text-xs font-bold mb-1 ${confirmedReferrals >= 12 ? 'text-green-600' : 'text-gray-400'}`}>12 Amigos</div>
                    <div className="text-[10px] text-gray-500">+1 Ano</div>
                </div>
            </div>
        </Card>

        {/* Share Section */}
        <div className="space-y-3 mb-8">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Seu link de convite</p>
            <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono truncate flex items-center">
                    {referralLink}
                </div>
                <Button variant="outline" size="icon" className="shrink-0 h-auto w-12 rounded-xl border-gray-200 dark:border-zinc-800" onClick={copyLink}>
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Button>
            </div>
            <ShareButton 
                showText 
                text="Compartilhar convite" 
                variant="default" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 shadow-md shadow-purple-200 dark:shadow-none"
                customTitle="Convite Xô Preguiça"
                customMessage={`Estou usando um app que facilitou muito minha vida financeira. Use meu código ${referralCode} e ganhe benefícios! Baixa aqui 👇`}
                customUrl={referralLink}
            />
        </div>

        {/* Referrals List */}
        <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Indicações
            </h3>
            
            <div className="space-y-3">
                {referrals.length === 0 ? (
                     <div className="text-center py-8 text-gray-500">
                        <p>Nenhuma indicação ainda.</p>
                        <p className="text-sm">Convide amigos para começar!</p>
                     </div>
                ) : (
                    referrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${referral.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {referral.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{referral.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(referral.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${referral.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {referral.status === 'confirmed' ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Confirmado
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-3 h-3" />
                                        Pendente
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg mt-6 flex gap-3 items-start">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">Como funciona a validação:</span> A indicação só conta quando seu amigo instalar o app, criar conta e fizer 3 lançamentos financeiros reais.
                </p>
            </div>
        </div>
      </div>
    </MobileLayout>
  );
}
