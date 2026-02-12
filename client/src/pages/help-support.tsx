import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, HelpCircle, MessageCircle, Mail, FileText, ChevronRight, BookOpen, Shield, CreditCard, PiggyBank, BarChart3, Car, Smartphone, Star, ExternalLink, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "Como adicionar uma transação?",
    answer: "Na tela principal, toque no botão '+' no centro da barra inferior. Você pode adicionar manualmente, por voz ou tirando foto de um comprovante.",
  },
  {
    question: "Como criar um orçamento mensal?",
    answer: "Vá em Ajustes > Orçamento e Limites. Lá você pode definir limites de gastos por categoria e acompanhar seu progresso ao longo do mês.",
  },
  {
    question: "Como funciona o backup dos meus dados?",
    answer: "Seus dados são salvos automaticamente na nuvem. Além disso, você pode exportar um backup local em formato JSON acessando Ajustes > Backup e Segurança.",
  },
  {
    question: "Como adicionar um cartão de crédito?",
    answer: "Acesse a seção de Cartões de Crédito no menu inferior ou pelo Dashboard. Toque em 'Adicionar Cartão' e preencha os dados como nome, limite, dia de fechamento e vencimento.",
  },
  {
    question: "O que é o plano Premium?",
    answer: "O plano Premium desbloqueia recursos avançados como IA para análise financeira, gestão de negócios, agenda financeira e muito mais. Acesse Ajustes > Seja Premium para conhecer.",
  },
  {
    question: "Como funciona o programa de indicação?",
    answer: "Ao indicar amigos, você ganha meses de Premium grátis. Acesse Ajustes > Indique e Ganhe Premium para compartilhar seu link e acompanhar suas indicações.",
  },
  {
    question: "Como registrar meus veículos?",
    answer: "Vá em Ajustes > Meus Veículos e adicione seus carros/motos. Assim você pode categorizar gastos com combustível, manutenção e IPVA por veículo.",
  },
  {
    question: "Posso usar o app no computador?",
    answer: "Sim! O app funciona perfeitamente no navegador do computador. Basta acessar o mesmo endereço e fazer login com sua conta.",
  },
  {
    question: "Como zerar todos os meus dados?",
    answer: "Em Ajustes, role até 'Zerar dados para testes' e toque em 'Zerar tudo agora'. Atenção: essa ação é irreversível e apaga todas as transações, cartões, metas e investimentos.",
  },
  {
    question: "Como funciona a entrada por voz?",
    answer: "Na tela de adicionar transação, escolha 'Por Voz'. Diga algo como 'Gastei 50 reais no mercado' e a IA vai preencher os campos automaticamente para você.",
  },
];

const guideCategories = [
  { icon: PiggyBank, label: "Finanças Pessoais", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  { icon: CreditCard, label: "Cartões de Crédito", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { icon: BarChart3, label: "Investimentos", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { icon: Car, label: "Veículos", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { icon: Smartphone, label: "Usar o App", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  { icon: Shield, label: "Segurança", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
];

export default function HelpSupport() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <MobileLayout showNav={false}>
      <div className="bg-gradient-to-br from-teal-600 to-emerald-600 min-h-[30vh] p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" data-testid="button-back">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Ajuda e Suporte</h1>
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold">Como podemos ajudar?</h2>
            <p className="text-teal-100 text-sm mt-1">Encontre respostas e suporte aqui</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-black -mt-6 rounded-t-3xl relative z-20 px-6 pt-8 pb-24">

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Card
            className="p-4 border-none shadow-md bg-white dark:bg-zinc-900 cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="card-contact-email"
            onClick={() => window.open('mailto:suporte@financeiro.app', '_blank')}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">E-mail</h3>
                <p className="text-xs text-gray-500">Envie sua dúvida</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-4 border-none shadow-md bg-white dark:bg-zinc-900 cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="card-contact-chat"
            onClick={() => window.open('https://wa.me/5511999999999?text=Olá, preciso de ajuda com o app financeiro', '_blank')}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">WhatsApp</h3>
                <p className="text-xs text-gray-500">Chat ao vivo</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Guias Rápidos</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {guideCategories.map((guide, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                data-testid={`guide-category-${index}`}
              >
                <div className={`w-10 h-10 ${guide.bg} rounded-full flex items-center justify-center`}>
                  <guide.icon className={`w-5 h-5 ${guide.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{guide.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-gray-900 dark:text-white">Perguntas Frequentes</h3>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <Card
                key={index}
                className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden"
                data-testid={`faq-item-${index}`}
              >
                <button
                  className="w-full p-4 flex items-center justify-between text-left"
                  onClick={() => toggleFaq(index)}
                  data-testid={`button-faq-${index}`}
                >
                  <span className="font-medium text-sm text-gray-900 dark:text-white pr-4">{item.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expandedFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5 border-none shadow-md bg-white dark:bg-zinc-900 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Avalie o App</h3>
              <p className="text-sm text-gray-500">Sua opinião nos ajuda a melhorar</p>
            </div>
          </div>
          <div className="flex gap-2 justify-center my-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="p-1" data-testid={`button-star-${star}`}>
                <Star className="w-8 h-8 text-yellow-400 hover:fill-yellow-400 transition-colors" />
              </button>
            ))}
          </div>
        </Card>

        <div className="p-4 bg-teal-50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-900/30">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
              <p className="font-bold mb-1">Sobre o App</p>
              <p>Versão 1.0.0</p>
              <p className="mt-1">Seus dados são protegidos com criptografia e salvos com segurança na nuvem.</p>
              <Link href="/terms-privacy" className="flex items-center gap-1 mt-2 text-teal-600 dark:text-teal-400 hover:text-teal-500">
                <ExternalLink className="w-3 h-3" />
                <span className="underline cursor-pointer" data-testid="link-terms-privacy">Termos de uso e Privacidade</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
