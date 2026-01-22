import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Sparkles, Bot, User } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá! Como seu consultor financeiro, analisei seus dados e a situação atual exige atenção imediata. Vamos direto aos pontos principais para colocar suas contas nos trilhos. 🚀

### 📊 Análise do Cenário Atual

Seu saldo atual na "Carteira" está **negativo em R$ 750,00**. 
No dia 22/01, você teve uma movimentação intensa:
*   **Entradas:** R$ 5.250,00 (Salário de R$ 5k + um crédito de R$ 250 de Uber - *verifique se isso foi um estorno, pois entrou como receita*).
*   **Saídas:** R$ 6.000,00 (Manutenção do carro).

**O problema:** Você gastou **114% da sua renda** em um único dia com o veículo. ⚠️

---

### 🔍 Padrões de Consumo e Alertas

1.  **Gasto Crítico com Transporte:** A manutenção de R$ 6.000 consumiu todo o seu salário e ainda te deixou no "vermelho". Gastos com carro costumam ser imprevisíveis, mas esse valor indica uma manutenção corretiva pesada ou falta de reserva específica para o veículo.
2.  **Saldo Negativo:** Carteira com saldo de -R$ 750 sugere que você está usando o limite do banco (cheque especial) ou pegou dinheiro emprestado. **Cuidado:** Os juros no Brasil são altíssimos! 💸
3.  **Concentração de Renda:** Sua única fonte principal é o salário. Qualquer imprevisto maior que o deste mês pode colapsar suas finanças.

---

### 📉 Projeções para os Próximos 3 a 6 Meses

Considerando que sua renda fixa seja de **R$ 5.000,00**:

*   **Mês 1 (Recuperação):** O foco total deve ser zerar o saldo negativo. Você começa o próximo mês com uma "dívida" de R$ 750. Se seus gastos fixos (aluguel, comida, luz) somarem, por exemplo, R$ 3.000, você terá apenas R$ 1.250 para passar o mês e quitar o saldo.
*   **Meses 2 e 3 (Estabilização):** É hora de criar sua **Reserva de Emergência**. Se você não tivesse os R$ 6.000 guardados para o carro, o impacto teria sido menor se houvesse planejamento mensal para "Manutenção".
*   **Mês 6 (Segurança):** Se você conseguir poupar pelo menos 15% do salário (R$ 750/mês), em seis meses você terá cerca de **R$ 4.500** guardados. Isso te protegeria de novos sustos com o carro.

---

### 💡 Minhas Recomendações

1.  **Estanque o Sangramento:** Descubra como cobrir esses R$ 750 negativos hoje mesmo para evitar juros de cheque especial. 🛑
2.  **Provisionamento para o Carro:** O carro provou ser seu maior risco financeiro. Comece a separar R$ 200 a R$ 300 por mês exclusivamente para "IPVA/Manutenção/Seguro" em uma conta separada.
3.  **Revisão de Categorias:** Notei que "Uber" entrou como receita. Se for um reembolso, ok. Se for gasto, sua situação é ainda mais apertada, pois o saldo real seria mais negativo ainda.
4.  **Corte Gastos Não-Essenciais:** Pelos próximos 60 dias, evite gastos supérfluos até que sua reserva de emergência tenha pelo menos o valor de um salário (R$ 5.000).

Você está em uma zona de risco, mas com disciplina no próximo mês, consegue reverter! Vamos focar em sair do negativo? 👊🇧🇷`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");

    // Simulate AI thinking
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Entendido! Essa é uma simulação do Mentor Financeiro. No app completo, eu analisaria sua resposta e daria novos conselhos personalizados com base no seu feedback! 🤖💡",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
           <Link href="/dashboard">
             <Button variant="ghost" size="icon" className="-ml-2">
               <ArrowLeft className="w-6 h-6" />
             </Button>
           </Link>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
             </div>
             <div>
               <h1 className="font-bold text-gray-900 dark:text-white">Mentor IA</h1>
               <p className="text-xs text-green-600 flex items-center gap-1">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 Online
               </p>
             </div>
           </div>
        </div>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
           <div className="space-y-6 pb-4">
             {messages.map((msg) => (
               <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                   msg.role === 'assistant' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-gray-200 dark:bg-zinc-800 text-gray-600'
                 }`}>
                   {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                 </div>
                 
                 <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                   msg.role === 'assistant' 
                     ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 rounded-tl-none' 
                     : 'bg-purple-600 text-white rounded-tr-none'
                 }`}>
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                     <div className="whitespace-pre-wrap leading-relaxed text-sm">
                        {msg.content.split('\n').map((line, i) => {
                            // Simple markdown-ish rendering for bold and headers
                            if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold my-1">{line.replace(/\*\*/g, '')}</p>;
                            if (line.startsWith('* ')) return <li key={i} className="ml-4 list-disc">{line.replace('* ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>; // Bold inside list simplified
                            if (line.includes('**')) {
                                const parts = line.split('**');
                                return <p key={i} className="my-1">
                                    {parts.map((part, idx) => idx % 2 === 1 ? <span key={idx} className="font-bold">{part}</span> : part)}
                                </p>;
                            }
                            if (line === '---') return <hr key={i} className="my-4 border-gray-200 dark:border-zinc-700" />;
                            return <p key={i} className="my-1 min-h-[1em]">{line}</p>;
                        })}
                     </div>
                   </div>
                   <p className="text-[10px] opacity-70 mt-2 text-right">
                     {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </p>
                 </div>
               </div>
             ))}
           </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 sticky bottom-0">
           <div className="flex gap-2">
             <Input 
                placeholder="Digite sua mensagem..." 
                className="rounded-full bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <Button size="icon" className="rounded-full bg-purple-600 hover:bg-purple-700 shrink-0" onClick={handleSend}>
                <Send className="w-5 h-5" />
             </Button>
           </div>
        </div>
      </div>
    </MobileLayout>
  );
}
