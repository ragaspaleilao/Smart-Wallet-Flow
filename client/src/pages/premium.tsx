import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Crown, Zap, Shield, Star } from "lucide-react";
import { Link } from "wouter";

export default function Premium() {
  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-white dark:bg-black">
        {/* Header */}
        <div className="p-6 relative overflow-hidden bg-purple-600 text-white pb-24">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <Link href="/settings">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 -ml-2 mb-4">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
            </Link>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Crown className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                Seja Premium
            </h1>
            <p className="text-purple-100 max-w-xs">
                Desbloqueie todo o poder da inteligência artificial financeira.
            </p>
        </div>

        <div className="flex-1 px-6 -mt-16 pb-8 space-y-6">
            
            {/* Free Plan */}
            <Card className="p-6 bg-white dark:bg-zinc-900 border-none shadow-lg relative overflow-hidden group hover:ring-2 hover:ring-gray-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Plano Gratuito</h3>
                        <p className="text-sm text-gray-500">Para começar a organizar</p>
                    </div>
                    <span className="font-bold text-2xl text-gray-900 dark:text-white">R$ 0</span>
                </div>
                <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        Registro manual ilimitado
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        Gráficos básicos
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        1 conta conectada
                    </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                    Plano Atual
                </Button>
            </Card>

            {/* Pro Plan */}
            <Card className="p-6 bg-gray-900 text-white border-none shadow-xl relative overflow-hidden transform scale-105 border-2 border-purple-500">
                <div className="absolute top-0 right-0 bg-purple-600 text-xs font-bold px-3 py-1 rounded-bl-xl">
                    MAIS POPULAR
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            Premium
                        </h3>
                        <p className="text-sm text-gray-400">Inteligência total</p>
                    </div>
                    <div className="text-right">
                         <span className="font-bold text-2xl">R$ 29,90</span>
                         <span className="text-xs text-gray-400 block">/mês</span>
                    </div>
                </div>
                <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-sm">
                        <div className="bg-purple-600/20 p-1 rounded-full">
                            <Check className="w-3 h-3 text-purple-400" />
                        </div>
                        Tudo do Gratuito
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <div className="bg-purple-600/20 p-1 rounded-full">
                            <Check className="w-3 h-3 text-purple-400" />
                        </div>
                        IA Financeira Completa
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <div className="bg-purple-600/20 p-1 rounded-full">
                            <Check className="w-3 h-3 text-purple-400" />
                        </div>
                        Módulo de Negócios (MEI)
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <div className="bg-purple-600/20 p-1 rounded-full">
                            <Check className="w-3 h-3 text-purple-400" />
                        </div>
                        Leitura de Notas por Foto
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <div className="bg-purple-600/20 p-1 rounded-full">
                            <Check className="w-3 h-3 text-purple-400" />
                        </div>
                        Exportação de Relatórios
                    </li>
                </ul>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12">
                    Assinar Agora
                </Button>
                <p className="text-[10px] text-gray-500 text-center mt-3">
                    Cancele quando quiser. 7 dias grátis.
                </p>
            </Card>

            {/* Business Plan */}
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-200" />
                            Empresarial
                        </h3>
                        <p className="text-sm text-blue-100">Para gestão completa</p>
                    </div>
                    <div className="text-right">
                         <span className="font-bold text-2xl">R$ 59,90</span>
                         <span className="text-xs text-blue-200 block">/mês</span>
                    </div>
                </div>
                <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-blue-300 shrink-0" />
                        Múltiplos Usuários
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-blue-300 shrink-0" />
                        Emissão de Notas (NFS-e)
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-blue-300 shrink-0" />
                        Gestão de Estoque
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-blue-300 shrink-0" />
                        Suporte Prioritário
                    </li>
                </ul>
                <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold">
                    Falar com Consultor
                </Button>
            </Card>

            <div className="text-center pt-4 pb-8">
                <p className="text-xs text-gray-500 mb-2">Dúvidas sobre os planos?</p>
                <Link href="/support">
                    <span className="text-sm font-semibold text-purple-600 cursor-pointer">Falar com Suporte</span>
                </Link>
            </div>

        </div>
      </div>
    </MobileLayout>
  );
}
