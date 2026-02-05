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
  creditPurchases: Array<{
    description: string;
    totalAmount: string;
    cardName: string;
    category: string;
    date: string;
    installments: number;
  }>;
  subscriptions: Array<{
    name: string;
    price: string;
    date: string;
    category: string;
  }>;
  vehicles: Array<{
    name: string;
    plate: string;
    expenses: Array<{ name: string; due: string; value: number; status: string }>;
  }>;
  vehicleExpenses: Array<{
    vehicleName: string;
    description: string;
    amount: string;
    date: string;
    status: string;
  }>;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCardSpending: number;
}

async function getFinancialContext(userId: string): Promise<FinancialContext> {
  const [accounts, transactions, creditCards, subscriptions, vehicles] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getCreditCards(userId),
    storage.getSubscriptions(userId),
    storage.getVehicles(userId),
  ]);

  // Buscar compras de cada cartão de crédito
  const allCreditPurchases = [];
  for (const card of creditCards) {
    const purchases = await storage.getCreditPurchases(card.id);
    for (const p of purchases) {
      allCreditPurchases.push({
        ...p,
        cardName: card.name,
      });
    }
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Pegar TODAS as transações (passadas e futuras) para dar contexto completo
  // Ordenar por data
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Separar transações de veículos (despesas parceladas como IPVA, Seguro)
  const vehicleTransactions = transactions.filter(t => t.vehicleId);
  
  // Transações regulares (últimos 3 meses)
  const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
  const recentTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= threeMonthsAgo && !t.vehicleId;
  });

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

  // Calcular gastos no cartão neste mês
  const monthlyCardPurchases = allCreditPurchases.filter(p => {
    const d = new Date(p.purchaseDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyCardSpending = monthlyCardPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);

  // Pegar compras de cartão dos últimos 3 meses
  const recentCardPurchases = allCreditPurchases.filter(p => {
    const d = new Date(p.purchaseDate);
    return d >= threeMonthsAgo;
  });

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  return {
    accounts: accounts.map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
    recentTransactions: recentTransactions.slice(0, 50).map(t => ({
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
    creditPurchases: recentCardPurchases.slice(0, 50).map(p => ({
      description: p.description,
      totalAmount: p.totalAmount,
      cardName: p.cardName,
      category: p.category,
      date: new Date(p.purchaseDate).toLocaleDateString('pt-BR'),
      installments: p.installments,
    })),
    subscriptions: subscriptions.map(s => ({
      name: s.name,
      price: s.price,
      date: s.date,
      category: s.category,
    })),
    vehicles: vehicles.map(v => ({
      name: v.name,
      plate: v.plate,
      expenses: v.expenses || [],
    })),
    vehicleExpenses: vehicleTransactions.map(t => {
      const vehicle = vehicles.find(v => v.id === t.vehicleId);
      return {
        vehicleName: vehicle?.name || 'Veículo',
        description: t.description,
        amount: t.amount,
        date: new Date(t.date).toLocaleDateString('pt-BR'),
        status: t.status || 'pending',
      };
    }),
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlyCardSpending,
  };
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await getFinancialContext(userId);

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça".
Sua personalidade: Brasileiro, direto, usa emojis e é muito atento. Você TEM ACESSO a todos os dados financeiros do usuário.

DADOS DO USUÁRIO AGORA:
- Saldo Total em Contas: R$ ${context.totalBalance.toFixed(2)}
- Gasto no Mês (dinheiro/débito): R$ ${context.monthlyExpenses.toFixed(2)}
- Gasto no Mês (cartão crédito): R$ ${context.monthlyCardSpending.toFixed(2)}
- Renda no Mês: R$ ${context.monthlyIncome.toFixed(2)}

CONTAS:
${context.accounts.length > 0 ? context.accounts.map(a => `- ${a.name} (${a.type}): R$ ${a.balance}`).join('\n') : 'Nenhuma conta cadastrada'}

CARTÕES DE CRÉDITO:
${context.creditCards.length > 0 
  ? context.creditCards.map(c => `- ${c.name}: Limite R$ ${c.creditLimit}, fecha dia ${c.closingDay}, vence dia ${c.dueDay}`).join('\n')
  : 'Nenhum cartão cadastrado'}

COMPRAS RECENTES NO CARTÃO:
${context.creditPurchases.length > 0
  ? context.creditPurchases.map(p => `- ${p.date}: ${p.description} - R$ ${p.totalAmount} no ${p.cardName} (${p.category})${p.installments > 1 ? ` - ${p.installments}x parcelas` : ''}`).join('\n')
  : 'Nenhuma compra no cartão'}

TRANSAÇÕES RECENTES (dinheiro/débito):
${context.recentTransactions.length > 0 ? context.recentTransactions.map(t => `- ${t.date}: ${t.description} - R$ ${t.amount} (${t.type === 'income' ? 'Receita' : 'Despesa'} - ${t.category})`).join('\n') : 'Nenhuma transação'}

ASSINATURAS E SERVIÇOS RECORRENTES:
${context.subscriptions.length > 0 
  ? context.subscriptions.map(s => `- ${s.name}: R$ ${s.price}/mês (${s.category}) - todo dia ${s.date}`).join('\n')
  : 'Nenhuma assinatura cadastrada'}

VEÍCULOS CADASTRADOS:
${context.vehicles.length > 0 
  ? context.vehicles.map(v => `- ${v.name} (${v.plate})`).join('\n')
  : 'Nenhum veículo cadastrado'}

DESPESAS DE VEÍCULOS (IPVA, Seguro, Licenciamento, etc - todas as parcelas):
${context.vehicleExpenses.length > 0
  ? context.vehicleExpenses.map(e => `- ${e.date}: ${e.description} - R$ ${e.amount} (${e.status === 'paid' ? 'PAGO' : 'PENDENTE'})`).join('\n')
  : 'Nenhuma despesa de veículo cadastrada'}

REGRAS IMPORTANTES:
1. VOCÊ TEM ACESSO aos dados acima. Não diga que não tem acesso!
2. Quando o usuário perguntar sobre compras no cartão, consulte a lista "COMPRAS RECENTES NO CARTÃO".
3. Se houver gastos parcelados, lembre-o do comprometimento dos próximos meses.
4. Sempre dê respostas completas, não corte no meio da frase.
5. Se o gasto for grande, pergunte sobre outras prioridades.

Responda sempre em Português do Brasil de forma amigável, como se fosse um chat de WhatsApp. Sempre termine suas frases completas.`;

  const fullPrompt = `${systemPrompt}

HISTÓRICO DA CONVERSA:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'Usuário' : 'Mentor'}: ${msg.content}`).join('\n')}

Usuário: ${message}

Mentor:`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }] 
      }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2000,
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
