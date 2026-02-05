import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { addMonths } from "date-fns";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface InvoiceSummary {
  month: string;
  year: number;
  total: number;
  dueDate: string;
}

interface CardWithInvoices {
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  currentInvoice: { month: string; total: number; dueDate: string };
  futureInvoices: InvoiceSummary[];
}

interface FinancialContext {
  accounts: Array<{ name: string; type: string; balance: string }>;
  totalBalance: number;
  cards: CardWithInvoices[];
  subscriptions: Array<{
    name: string;
    price: string;
    billingDay: string;
    paymentInfo: string;
  }>;
  upcomingExpenses: Array<{
    description: string;
    amount: string;
    date: string;
  }>;
  totalFutureCardExpenses: number;
  totalFutureOtherExpenses: number;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getInvoiceCompetenceMonth(purchaseDate: Date, closingDay: number): Date {
  if (purchaseDate.getDate() > closingDay) {
    return new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1);
  }
  return addMonths(new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1), -1);
}

function getCurrentInvoiceMonth(closingDay: number): Date {
  const now = new Date();
  if (now.getDate() > closingDay) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -1);
}

function calculateInvoiceForMonth(
  purchases: any[], 
  closingDay: number, 
  dueDay: number,
  targetMonth: Date,
  annualFee: number = 0
): number {
  let total = 0;
  
  for (const purchase of purchases) {
    if (purchase.status !== 'active') continue;
    
    const purchaseDate = new Date(purchase.purchaseDate);
    const firstInstallmentMonth = getInvoiceCompetenceMonth(purchaseDate, closingDay);
    
    for (let i = 0; i < purchase.installments; i++) {
      const installmentMonth = addMonths(firstInstallmentMonth, i);
      
      if (installmentMonth.getMonth() === targetMonth.getMonth() && 
          installmentMonth.getFullYear() === targetMonth.getFullYear()) {
        total += parseFloat(purchase.installmentValue);
      }
    }
  }
  
  if (annualFee > 0) {
    total += annualFee / 12;
  }
  
  return total;
}

async function getFinancialContext(userId: string): Promise<FinancialContext> {
  const [accounts, transactions, creditCards, subscriptions] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getCreditCards(userId),
    storage.getSubscriptions(userId),
  ]);

  const now = new Date();
  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  const cards: CardWithInvoices[] = [];
  let totalFutureCardExpenses = 0;
  
  for (const card of creditCards) {
    const purchases = await storage.getCreditPurchases(userId, card.id);
    const currentInvoiceMonth = getCurrentInvoiceMonth(card.closingDay);
    const annualFee = card.hasAnnualFee && card.annualFeeValue ? parseFloat(card.annualFeeValue) : 0;
    
    // Current invoice
    const currentTotal = calculateInvoiceForMonth(purchases, card.closingDay, card.dueDay, currentInvoiceMonth, annualFee);
    const currentDueMonth = addMonths(currentInvoiceMonth, 1);
    const currentDueDate = `${card.dueDay}/${String(currentDueMonth.getMonth() + 1).padStart(2, '0')}/${currentDueMonth.getFullYear()}`;
    
    // Future invoices (next 12 months)
    const futureInvoices: InvoiceSummary[] = [];
    for (let i = 1; i <= 12; i++) {
      const futureMonth = addMonths(currentInvoiceMonth, i);
      const futureTotal = calculateInvoiceForMonth(purchases, card.closingDay, card.dueDay, futureMonth, annualFee);
      
      if (futureTotal > 0) {
        const dueMonth = addMonths(futureMonth, 1);
        futureInvoices.push({
          month: monthNames[futureMonth.getMonth()],
          year: futureMonth.getFullYear(),
          total: futureTotal,
          dueDate: `${card.dueDay}/${String(dueMonth.getMonth() + 1).padStart(2, '0')}/${dueMonth.getFullYear()}`,
        });
        totalFutureCardExpenses += futureTotal;
      }
    }
    
    cards.push({
      name: card.name,
      creditLimit: card.creditLimit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      currentInvoice: {
        month: monthNames[currentInvoiceMonth.getMonth()],
        total: currentTotal,
        dueDate: currentDueDate,
      },
      futureInvoices,
    });
    
    totalFutureCardExpenses += currentTotal;
  }

  // Upcoming expenses (all future, not just 30 days)
  const upcomingExpenses = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 20)
    .map(t => ({
      description: t.description,
      amount: t.amount,
      date: new Date(t.date).toLocaleDateString('pt-BR'),
    }));

  const totalFutureOtherExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= now)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  // Subscriptions
  const subscriptionsList = subscriptions.map(s => {
    const creditCard = creditCards.find(c => c.id === s.creditCardId);
    let paymentInfo = creditCard ? `Cartão ${creditCard.name}` : (s.paymentMethod || 'Não definido');
    
    return {
      name: s.name,
      price: s.price,
      billingDay: s.date,
      paymentInfo,
    };
  });

  return {
    accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
    totalBalance,
    cards,
    subscriptions: subscriptionsList,
    upcomingExpenses,
    totalFutureCardExpenses,
    totalFutureOtherExpenses,
  };
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await getFinancialContext(userId);

  const today = new Date();
  const formattedToday = today.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Build cards section with current and future invoices
  const cardsSection = context.cards.map(card => {
    const futureList = card.futureInvoices.length > 0 
      ? card.futureInvoices.map(inv => `    ${inv.month}/${inv.year}: R$ ${inv.total.toFixed(2)} (vence ${inv.dueDate})`).join('\n')
      : '    (Sem parcelas futuras)';
    
    return `📌 ${card.name}
   Fatura Atual (${card.currentInvoice.month}): R$ ${card.currentInvoice.total.toFixed(2)} - vence ${card.currentInvoice.dueDate}
   Faturas Futuras (próximos 12 meses):
${futureList}`;
  }).join('\n\n');

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça". Você tem ACESSO COMPLETO aos dados do usuário.

📅 HOJE: ${formattedToday}

💰 SALDO DISPONÍVEL: R$ ${context.totalBalance.toFixed(2)}
${context.accounts.map(a => `  - ${a.name}: R$ ${a.balance}`).join('\n')}

💳 CARTÕES DE CRÉDITO (COM FATURAS FUTURAS):
${cardsSection}

📊 TOTAIS PROJETADOS:
- Total de todas as faturas de cartão (atual + futuras): R$ ${context.totalFutureCardExpenses.toFixed(2)}
- Total de outras despesas agendadas: R$ ${context.totalFutureOtherExpenses.toFixed(2)}
- TOTAL GERAL DE COMPROMISSOS: R$ ${(context.totalFutureCardExpenses + context.totalFutureOtherExpenses).toFixed(2)}

📆 PRÓXIMAS DESPESAS AGENDADAS (débito/pix):
${context.upcomingExpenses.length > 0 
  ? context.upcomingExpenses.slice(0, 10).map(e => `- ${e.date}: ${e.description} - R$ ${e.amount}`).join('\n')
  : 'Nenhuma despesa agendada'}

📱 ASSINATURAS:
${context.subscriptions.length > 0 
  ? context.subscriptions.map(s => `- ${s.name}: R$ ${s.price}/mês (dia ${s.billingDay}) - ${s.paymentInfo}`).join('\n')
  : 'Nenhuma assinatura'}

INSTRUÇÕES:
1. Você TEM ACESSO a todos os dados acima, incluindo FATURAS FUTURAS de cada cartão.
2. Quando o usuário perguntar sobre projeção futura, USE os dados de "Faturas Futuras" de cada cartão.
3. Para calcular saldo futuro: Saldo Atual - Total de Compromissos até a data solicitada.
4. Seja detalhado quando o usuário pedir projeções ou análises.
5. Cite os valores específicos das faturas futuras quando relevante.
6. SEMPRE complete suas respostas. NUNCA corte no meio.`;

  const fullPrompt = `${systemPrompt}

HISTÓRICO:
${conversationHistory.slice(-4).map(msg => `${msg.role === 'user' ? 'Usuário' : 'Você'}: ${msg.content}`).join('\n')}

Usuário: ${message}

Responda de forma completa e detalhada:`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }] 
      }],
      config: {
        temperature: 0.4,
        maxOutputTokens: 8192,
      }
    });

    const texto = result.text || "";
    return texto || "Desculpe, não consegui processar sua mensagem.";
  } catch (error: any) {
    console.error("Erro detalhado da IA:", error);
    
    if (error.message?.includes('not found')) {
      return "⚠️ Erro de configuração: Modelo não encontrado.";
    }
    
    if (error.status === 429) {
      return "⚠️ O serviço está temporariamente sobrecarregado. Aguarde um pouco.";
    }
    
    return "Tive um probleminha técnico. Pode repetir?";
  }
}
