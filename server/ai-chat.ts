import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface FinancialContext {
  accounts: Array<{ name: string; type: string; balance: string }>;
  recentTransactions: Array<{ 
    description: string; 
    amount: string; 
    type: string; 
    category: string; 
    date: string 
  }>;
  creditCards: Array<{ 
    name: string; 
    creditLimit: string; 
    closingDay: number; 
    dueDay: number 
  }>;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

async function getFinancialContext(userId: string): Promise<FinancialContext> {
  const [accounts, transactions, creditCards] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getCreditCards(userId),
  ]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  return {
    accounts: accounts.map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
    recentTransactions: transactions.slice(0, 15).map(t => ({
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: new Date(t.date).toLocaleDateString('pt-BR'),
    })),
    creditCards: creditCards.map(c => ({
      name: c.name,
      creditLimit: c.creditLimit,
      closingDay: c.closingDay,
      dueDay: c.dueDay,
    })),
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
  };
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await getFinancialContext(userId);

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça", um consultor financeiro pessoal brasileiro. 
Seu papel é analisar as finanças do usuário e dar conselhos práticos, diretos e personalizados.

DADOS FINANCEIROS DO USUÁRIO:
- Saldo total: R$ ${context.totalBalance.toFixed(2)}
- Receita do mês: R$ ${context.monthlyIncome.toFixed(2)}
- Despesas do mês: R$ ${context.monthlyExpenses.toFixed(2)}
- Saldo do mês: R$ ${(context.monthlyIncome - context.monthlyExpenses).toFixed(2)}

CONTAS:
${context.accounts.map(a => `- ${a.name} (${a.type}): R$ ${a.balance}`).join('\n')}

CARTÕES DE CRÉDITO:
${context.creditCards.length > 0 
  ? context.creditCards.map(c => `- ${c.name}: Limite R$ ${c.creditLimit}, fecha dia ${c.closingDay}, vence dia ${c.dueDay}`).join('\n')
  : 'Nenhum cartão cadastrado'}

TRANSAÇÕES RECENTES:
${context.recentTransactions.map(t => `- ${t.date}: ${t.description} - R$ ${t.amount} (${t.type === 'income' ? 'Receita' : 'Despesa'} - ${t.category})`).join('\n')}

REGRAS:
1. Seja direto e prático
2. Use linguagem informal brasileira
3. Use emojis moderadamente
4. Dê conselhos específicos baseados nos dados reais
5. Sempre sugira ações práticas`;

  const fullPrompt = `${systemPrompt}

HISTÓRICO DA CONVERSA:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'Usuário' : 'Mentor'}: ${msg.content}`).join('\n')}

Usuário: ${message}

Mentor:`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });

    const texto = result.text || "";
    return texto || "Desculpe, não consegui processar sua mensagem.";
  } catch (error: any) {
    console.error("AI Chat error:", error);
    
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      return "⚠️ O serviço está temporariamente sobrecarregado. Por favor, aguarde 1 minuto e tente novamente.";
    }
    
    throw new Error("Erro ao processar mensagem com IA");
  }
}
