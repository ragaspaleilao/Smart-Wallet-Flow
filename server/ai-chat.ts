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

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça".
Sua personalidade: Brasileiro, direto, usa emojis e é muito atento.

DADOS DO USUÁRIO AGORA:
- Saldo Total: R$ ${context.totalBalance.toFixed(2)}
- Gasto no Mês: R$ ${context.monthlyExpenses.toFixed(2)}
- Renda no Mês: R$ ${context.monthlyIncome.toFixed(2)}

CONTAS:
${context.accounts.map(a => `- ${a.name} (${a.type}): R$ ${a.balance}`).join('\n')}

CARTÕES DE CRÉDITO:
${context.creditCards.length > 0 
  ? context.creditCards.map(c => `- ${c.name}: Limite R$ ${c.creditLimit}, fecha dia ${c.closingDay}, vence dia ${c.dueDay}`).join('\n')
  : 'Nenhum cartão cadastrado'}

TRANSAÇÕES RECENTES:
${context.recentTransactions.map(t => `- ${t.date}: ${t.description} - R$ ${t.amount} (${t.type === 'income' ? 'Receita' : 'Despesa'} - ${t.category})`).join('\n')}

REGRAS DE OURO:
1. Se o usuário disser que comprou algo, calcule o impacto no saldo.
2. Se houver gastos parcelados, lembre-o do comprometimento dos próximos meses.
3. SEMPRE relacione o gasto com as metas (se houver).
4. Se o gasto for grande, pergunte sobre outras prioridades.

Responda sempre em Português do Brasil de forma curta e amigável, como se fosse um chat de WhatsApp.`;

  const fullPrompt = `${systemPrompt}

HISTÓRICO DA CONVERSA:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'Usuário' : 'Mentor'}: ${msg.content}`).join('\n')}

Usuário: ${message}

Mentor:`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }] 
      }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    });

    const texto = result.text || "";
    return texto || "Desculpe, não consegui processar sua mensagem.";
  } catch (error: any) {
    console.error("Erro detalhado da IA:", error);
    
    if (error.message?.includes('not found')) {
      return "⚠️ Erro de configuração: Modelo não encontrado. Verifique se o nome do modelo está correto.";
    }
    
    if (error.status === 429) {
      return "⚠️ O serviço está temporariamente sobrecarregado. Aguarde um pouco.";
    }
    
    return "Tive um probleminha técnico. Pode repetir?";
  }
}
