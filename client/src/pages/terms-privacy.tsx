import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Lock, Eye, UserCheck, Database, Trash2, Bell, Scale } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

type Tab = "termos" | "privacidade";

export default function TermsPrivacy() {
  const [activeTab, setActiveTab] = useState<Tab>("termos");

  return (
    <MobileLayout showNav={false}>
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 min-h-[25vh] p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/help-support">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" data-testid="button-back">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Termos e Privacidade</h1>
          </div>

          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <p className="text-slate-300 text-sm mt-1">Em conformidade com a LGPD</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-black -mt-6 rounded-t-3xl relative z-20 px-6 pt-6 pb-24">

        <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm mb-6">
          <button
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "termos" ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("termos")}
            data-testid="tab-termos"
          >
            <div className="flex items-center justify-center gap-1.5">
              <FileText className="w-4 h-4" />
              Termos de Uso
            </div>
          </button>
          <button
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "privacidade" ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-black" : "text-gray-500"}`}
            onClick={() => setActiveTab("privacidade")}
            data-testid="tab-privacidade"
          >
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="w-4 h-4" />
              Privacidade
            </div>
          </button>
        </div>

        {activeTab === "termos" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">1. Aceitação dos Termos</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Ao acessar e utilizar este aplicativo de gestão financeira pessoal, você concorda com estes Termos de Uso. Caso não concorde com alguma condição, recomendamos que não utilize o serviço. O uso continuado do aplicativo constitui a aceitação integral destes termos.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">2. Cadastro e Conta</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Para utilizar o aplicativo, é necessário criar uma conta com informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente caso suspeite de uso não autorizado.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">3. Uso do Serviço</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>O aplicativo é uma ferramenta de organização financeira pessoal. Ao utilizá-lo, você concorda em:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Não utilizar o serviço para fins ilegais ou não autorizados</li>
                  <li>Não tentar acessar dados de outros usuários</li>
                  <li>Não interferir no funcionamento normal do aplicativo</li>
                  <li>Fornecer informações precisas sobre suas finanças</li>
                </ul>
                <p>O aplicativo não substitui consultoria financeira profissional. As informações e análises fornecidas são meramente informativas.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">4. Plano Premium</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>O plano Premium oferece funcionalidades adicionais mediante pagamento. Ao assinar:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>A cobrança será recorrente conforme o plano escolhido</li>
                  <li>O cancelamento pode ser feito a qualquer momento</li>
                  <li>Após o cancelamento, o acesso Premium permanece até o fim do período pago</li>
                  <li>Não haverá reembolso proporcional por período não utilizado</li>
                </ul>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Scale className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">5. Limitação de Responsabilidade</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                O aplicativo é fornecido "como está". Não nos responsabilizamos por decisões financeiras tomadas com base nas informações do aplicativo, perdas de dados decorrentes de mau uso, indisponibilidade temporária do serviço ou erros de cálculo em funcionalidades de IA. Recomendamos sempre manter backup dos seus dados.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">6. Alterações nos Termos</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações serão comunicadas por meio do aplicativo e/ou por e-mail. O uso continuado do serviço após as modificações constitui aceitação dos novos termos.
              </p>
            </div>
          </div>
        )}

        {activeTab === "privacidade" && (
          <div className="space-y-6">
            <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-4 border border-teal-100 dark:border-teal-900/30 mb-2">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-sm text-teal-800 dark:text-teal-300 leading-relaxed">
                  Esta Política de Privacidade está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> e descreve como coletamos, usamos e protegemos seus dados pessoais.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">1. Dados que Coletamos</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p><strong>Dados de cadastro:</strong> nome, e-mail e foto de perfil fornecidos no momento do login.</p>
                <p><strong>Dados financeiros:</strong> transações, contas bancárias, cartões, investimentos, metas, veículos e assinaturas que você registra voluntariamente no aplicativo.</p>
                <p><strong>Dados de uso:</strong> informações sobre como você interage com o aplicativo para melhorar a experiência.</p>
                <p className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                  <strong>Base legal (LGPD Art. 7º):</strong> Consentimento do titular e execução de contrato.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">2. Como Usamos seus Dados</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Fornecer e manter o serviço de gestão financeira</li>
                  <li>Gerar relatórios e análises personalizadas das suas finanças</li>
                  <li>Processar funcionalidades de IA (análise e categorização de gastos)</li>
                  <li>Enviar notificações sobre vencimentos e metas</li>
                  <li>Melhorar a experiência do usuário e o funcionamento do app</li>
                </ul>
                <p className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                  <strong>Princípio da finalidade (LGPD Art. 6º, I):</strong> Seus dados são tratados apenas para os fins informados e compatíveis com o serviço.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">3. Segurança dos Dados</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>Adotamos medidas técnicas e administrativas para proteger seus dados:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Criptografia em trânsito (HTTPS/TLS) e em repouso</li>
                  <li>Armazenamento seguro em servidores com acesso restrito</li>
                  <li>Autenticação segura via provedor de identidade</li>
                  <li>Backups regulares para prevenção de perda de dados</li>
                  <li>Monitoramento contínuo contra acessos não autorizados</li>
                </ul>
                <p className="text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                  <strong>Segurança (LGPD Art. 6º, VII e Art. 46):</strong> Utilizamos medidas técnicas aptas a proteger os dados pessoais de acessos não autorizados.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">4. Seus Direitos (LGPD Art. 18)</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>Como titular dos dados, você tem direito a:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Acesso:</strong> Solicitar quais dados pessoais seus possuímos</li>
                  <li><strong>Correção:</strong> Corrigir dados incompletos ou desatualizados</li>
                  <li><strong>Exclusão:</strong> Solicitar a eliminação dos seus dados pessoais</li>
                  <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado (JSON)</li>
                  <li><strong>Revogação:</strong> Revogar o consentimento a qualquer momento</li>
                  <li><strong>Informação:</strong> Saber com quem seus dados são compartilhados</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento em caso de descumprimento da LGPD</li>
                </ul>
                <p>Para exercer seus direitos, entre em contato pelo e-mail de suporte ou utilize a função de exportação/exclusão de dados disponível no aplicativo.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">5. Retenção e Exclusão</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar exclusão da conta:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Todos os dados pessoais serão removidos em até 15 dias úteis</li>
                  <li>Dados anonimizados podem ser retidos para fins estatísticos</li>
                  <li>Dados necessários para obrigações legais serão mantidos pelo prazo legal</li>
                </ul>
                <p>Você pode apagar seus dados a qualquer momento em Ajustes &gt; Zerar dados.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">6. Compartilhamento de Dados</h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p><strong>Não vendemos seus dados pessoais.</strong> O compartilhamento ocorre apenas com:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Provedores de infraestrutura:</strong> para hospedagem e armazenamento seguro</li>
                  <li><strong>Serviços de IA:</strong> para processamento de funcionalidades inteligentes (dados são processados sem identificação pessoal)</li>
                  <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial</li>
                </ul>
                <p className="text-xs bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
                  <strong>Compartilhamento (LGPD Art. 7º, §5):</strong> O controlador deverá informar ao titular sobre o compartilhamento de dados necessário para a prestação do serviço.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">7. Encarregado de Dados (DPO)</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Em conformidade com o Art. 41 da LGPD, disponibilizamos um canal de comunicação para questões relacionadas ao tratamento de dados pessoais. Para dúvidas, solicitações ou reclamações sobre o tratamento dos seus dados, entre em contato pelo e-mail de suporte disponível na seção Ajuda e Suporte do aplicativo.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-zinc-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Última atualização: Fevereiro de 2026
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lei Geral de Proteção de Dados - Lei nº 13.709/2018
              </p>
            </div>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
