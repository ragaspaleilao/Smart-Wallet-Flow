import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Mic, 
  Camera, 
  Bot,
  Shield,
  Smartphone
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-financas-facil.jpg" alt="Finanças Fácil" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold text-[#0a2540]">
              Finanças Fácil
            </span>
          </div>
          <a href="/api/login">
            <Button className="bg-gradient-to-r from-purple-600 to-green-500 hover:opacity-90" data-testid="button-login">
              Entrar
            </Button>
          </a>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Organize suas financas
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
              sem esforco
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Registre gastos por voz, foto ou texto. Deixe a IA cuidar do resto.
            Simples assim.
          </p>
          <a href="/api/login">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-green-500 hover:opacity-90 text-lg px-8 py-6" data-testid="button-get-started">
              Comecar Gratis
            </Button>
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Gratis para sempre. Sem cartao de credito.
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tudo que voce precisa
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Comando de Voz</h3>
                <p className="text-gray-600">
                  Diga "Gastei 50 no mercado" e pronto. A IA entende e registra.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Scanner de Notas</h3>
                <p className="text-gray-600">
                  Tire foto do cupom fiscal e deixe a IA extrair os dados.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Mentor IA</h3>
                <p className="text-gray-600">
                  Converse com seu consultor financeiro pessoal 24/7.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cartoes de Credito</h3>
                <p className="text-gray-600">
                  Controle faturas, parcelas e datas de vencimento.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Metas e Investimentos</h3>
                <p className="text-gray-600">
                  Acompanhe seu progresso rumo aos seus objetivos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multi-dispositivo</h3>
                <p className="text-gray-600">
                  Acesse de qualquer lugar: celular, tablet ou computador.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-green-500 rounded-3xl p-12 text-white">
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-4">
              Seus dados estao seguros
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Cada usuario tem seu proprio banco de dados separado.
              Suas informacoes nunca sao compartilhadas.
            </p>
            <a href="/api/login">
              <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-start-now">
                Comecar Agora
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2026 Finanças Fácil. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
