import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Sparkles, Bot, User, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { getUserId } from "@/lib/api";

async function postAiChat(message: string, history: Array<{ role: string; content: string }>) {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({ message, history }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get AI response');
  }
  
  return response.json();
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    setIsLoading(true);
    
    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const data = await postAiChat(message, history);

      const aiResponse: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Desculpe, não consegui processar sua mensagem. Tente novamente em alguns segundos.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    setHasStarted(true);
    setIsLoading(true);

    try {
      const data = await postAiChat(
        "Olá! Analise minha situação financeira atual e me dê um resumo com recomendações.",
        []
      );

      const aiResponse: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages([aiResponse]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Desculpe, não consegui analisar seus dados. Verifique sua conexão e tente novamente.",
        timestamp: new Date()
      };
      setMessages([errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = inputValue.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    
    await sendMessage(userMessage);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
           <Link href="/dashboard">
             <Button variant="ghost" size="icon" className="-ml-2" data-testid="button-back">
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
          {!hasStarted ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mentor Financeiro IA</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xs">
                Seu consultor financeiro pessoal powered by Gemini. Receba análises e conselhos baseados nos seus dados reais.
              </p>
              <Button 
                onClick={startConversation}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isLoading}
                data-testid="button-start-conversation"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Iniciar Análise
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} data-testid={`message-${msg.role}-${msg.id}`}>
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
                             if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                             if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
                             if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold my-1">{line.replace(/\*\*/g, '')}</p>;
                             if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.replace(/^[*-] /, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
                             if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
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
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analisando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        {hasStarted && (
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 sticky bottom-0">
             <div className="flex gap-2">
               <Input 
                  placeholder="Digite sua pergunta..." 
                  className="rounded-full bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  data-testid="input-message"
               />
               <Button 
                 size="icon" 
                 className="rounded-full bg-purple-600 hover:bg-purple-700 shrink-0" 
                 onClick={handleSend}
                 disabled={isLoading || !inputValue.trim()}
                 data-testid="button-send"
               >
                  <Send className="w-5 h-5" />
               </Button>
             </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
