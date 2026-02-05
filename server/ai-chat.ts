import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { addMonths } from "date-fns";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface CardSummary {
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  currentInvoiceTotal: number;
  currentInvoiceItems: string[];
  currentInvoiceMonth: string;
}

interface FinancialContext {
  accounts: Array<{ name: string; type: string; balance: string }>;
  totalBalance: number;
  cardSummaries: CardSummary[];
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
    status: string;
  }>;
}

// Helper: determine invoice competence month for a purchase
function getInvoiceCompetenceMonth(purchaseDate: Date, closingDay: number): Date {
  // If purchase was made AFTER closing day, it belongs to current month's invoice
  // If purchase was made ON or BEFORE closing day, it belongs to previous month's invoice
  if (purchaseDate.getDate() > closingDay) {
    return new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1);
  }
  return addMonths(new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1), -1);
}

// Helper: get current invoice competence month based on today
function getCurrentInvoiceMonth(closingDay: number): Date {
  const now = new Date();
  // If today > closing day, current invoice is for CURRENT month (closes next month)
  // If today <= closing day, current invoice is for PREVIOUS month (closes this month)
  if (now.getDate() > closingDay) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -1);
}

async function getFinancialContext(userId: string): Promise<FinancialContext> {
  const [accounts, transactions, creditCards, subscriptions, vehicles] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getCreditCards(userId),
    storage.getSubscriptions(userId),
    storage.getVehicles(userId),
  ]);

  const now = new Date();
  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  // Build card summaries with current invoice totals
  const cardSummaries: CardSummary[] = [];
  
  for (const card of creditCards) {
    const purchases = await storage.getCreditPurchases(userId, card.id);
    const currentInvoiceMonth = getCurrentInvoiceMonth(card.closingDay);
    
    let invoiceTotal = 0;
    const invoiceItems: string[] = [];
    
    for (const purchase of purchases) {
      if (purchase.status !== 'active') continue;
      
      const purchaseDate = new Date(purchase.purchaseDate);
      const firstInstallmentMonth = getInvoiceCompetenceMonth(purchaseDate, card.closingDay);
      
      // Check each installment
      for (let i = 0; i < purchase.installments; i++) {
        const installmentMonth = addMonths(firstInstallmentMonth, i);
        
        if (installmentMonth.getMonth() === currentInvoiceMonth.getMonth() && 
            installmentMonth.getFullYear() === currentInvoiceMonth.getFullYear()) {
          const value = parseFloat(purchase.installmentValue);
          invoiceTotal += value;
          
          const installmentLabel = purchase.installments > 1 
            ? ` (${i + 1}/${purchase.installments})`
            : '';
          invoiceItems.push(`${purchase.description}${installmentLabel}: R$ ${value.toFixed(2)}`);
        }
      }
    }
    
    // Add annual fee if applicable
    if (card.hasAnnualFee && card.annualFeeValue) {
      const feeValue = parseFloat(card.annualFeeValue) / 12;
      invoiceTotal += feeValue;
      invoiceItems.push(`Anuidade: R$ ${feeValue.toFixed(2)}`);
    }

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    cardSummaries.push({
      name: card.name,
      creditLimit: card.creditLimit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      currentInvoiceTotal: invoiceTotal,
      currentInvoiceItems: invoiceItems.slice(0, 10), // Limit to 10 items
      currentInvoiceMonth: monthNames[currentInvoiceMonth.getMonth()],
    });
  }

  // Get upcoming expenses (next 30 days, excluding vehicle expenses)
  const thirtyDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
  const upcomingExpenses = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && !t.vehicleId && d >= now && d <= thirtyDaysFromNow;
    })
    .map(t => ({
      description: t.description,
      amount: t.amount,
      date: new Date(t.date).toLocaleDateString('pt-BR'),
      status: t.status || 'pending',
    }))
    .slice(0, 10);

  // Build subscription info
  const subscriptionsList = subscriptions.map(s => {
    const creditCard = creditCards.find(c => c.id === s.creditCardId);
    let paymentInfo = '';
    if (creditCard) {
      paymentInfo = `Cartão ${creditCard.name}`;
    } else if (s.paymentMethod === 'debit') {
      paymentInfo = 'Débito';
    } else if (s.paymentMethod === 'pix') {
      paymentInfo = 'PIX';
    } else {
      paymentInfo = s.paymentMethod || 'Não definido';
    }
    
    return {
      name: s.name,
      price: s.price,
      billingDay: s.date,
      paymentInfo,
    };
  });

  return {
    accounts: accounts.map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
    totalBalance,
    cardSummaries,
    subscriptions: subscriptionsList,
    upcomingExpenses,
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

  // Build cards section
  const cardsSection = context.cardSummaries.length > 0 
    ? context.cardSummaries.map(card => {
        const itemsList = card.currentInvoiceItems.length > 0 
          ? card.currentInvoiceItems.map(item => `    - ${item}`).join('\n')
          : '    (Nenhum lançamento)';
        
        return `📌 ${card.name}
   Fatura ${card.currentInvoiceMonth}: R$ ${card.currentInvoiceTotal.toFixed(2)}
   Fecha dia ${card.closingDay}, vence dia ${card.dueDay}
   Limite: R$ ${card.creditLimit}
   Lançamentos:
${itemsList}`;
      }).join('\n\n')
    : 'Nenhum cartão cadastrado';

  const systemPrompt = `Você é um assistente financeiro simples e direto do app "Xô Preguiça".

📅 HOJE: ${formattedToday}

💰 SALDO DISPONÍVEL: R$ ${context.totalBalance.toFixed(2)}
${context.accounts.map(a => `  - ${a.name}: R$ ${a.balance}`).join('\n')}

💳 CARTÕES DE CRÉDITO (FATURAS ATUAIS):
${cardsSection}

📱 ASSINATURAS RECORRENTES:
${context.subscriptions.length > 0 
  ? context.subscriptions.map(s => `- ${s.name}: R$ ${s.price}/mês (dia ${s.billingDay}) - ${s.paymentInfo}`).join('\n')
  : 'Nenhuma assinatura'}

📆 PRÓXIMOS PAGAMENTOS (30 dias):
${context.upcomingExpenses.length > 0 
  ? context.upcomingExpenses.map(e => `- ${e.date}: ${e.description} - R$ ${e.amount}`).join('\n')
  : 'Nenhum pagamento agendado'}

REGRAS:
1. Seja SIMPLES e DIRETO. Nada de análises complexas.
2. Responda o que foi perguntado, sem inventar problemas.
3. NUNCA diga que uma assinatura está atrasada se ela é paga no cartão de crédito.
4. Use emojis com moderação.
5. Respostas curtas - máximo 200 palavras.
6. Foque no que o usuário perguntou.`;

  const fullPrompt = `${systemPrompt}

HISTÓRICO:
${conversationHistory.slice(-4).map(msg => `${msg.role === 'user' ? 'Usuário' : 'Você'}: ${msg.content}`).join('\n')}

Usuário: ${message}

Responda de forma simples e direta:`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }] 
      }],
      config: {
        temperature: 0.5,
        maxOutputTokens: 2000,
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
