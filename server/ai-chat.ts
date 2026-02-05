import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

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

async function buildCompleteContext(userId: string): Promise<string> {
  const [accounts, transactions, creditCards, subscriptions, vehicles, goals, investments, creditPayments] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getCreditCards(userId),
    storage.getSubscriptions(userId),
    storage.getVehicles(userId),
    storage.getGoals(userId),
    storage.getInvestments(userId),
    storage.getCreditPayments(userId),
  ]);

  const now = new Date();
  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  let context = '';

  // ========== ACCOUNTS ==========
  context += `\n💰 CONTAS E SALDOS:\n`;
  context += `Saldo Total: R$ ${totalBalance.toFixed(2)}\n`;
  for (const acc of accounts) {
    context += `- ${acc.name} (${acc.type}): R$ ${acc.balance}\n`;
  }

  // ========== TRANSACTIONS (Past, Present, Future) ==========
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const pastTransactions = sortedTransactions.filter(t => new Date(t.date) < now);
  const futureTransactions = sortedTransactions.filter(t => new Date(t.date) >= now);
  
  // Calculate totals by month
  const monthlyTotals: { [key: string]: { income: number; expense: number } } = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTotals[key]) monthlyTotals[key] = { income: 0, expense: 0 };
    if (t.type === 'income') {
      monthlyTotals[key].income += parseFloat(t.amount);
    } else {
      monthlyTotals[key].expense += parseFloat(t.amount);
    }
  }

  context += `\n📊 RESUMO MENSAL DE TRANSAÇÕES (débito/pix/dinheiro):\n`;
  const sortedMonths = Object.keys(monthlyTotals).sort();
  for (const month of sortedMonths) {
    const [y, m] = month.split('-');
    context += `${monthNames[parseInt(m) - 1]}/${y}: Receita R$ ${monthlyTotals[month].income.toFixed(2)} | Despesa R$ ${monthlyTotals[month].expense.toFixed(2)}\n`;
  }

  context += `\n📅 TRANSAÇÕES PASSADAS (últimas 20):\n`;
  const recentPast = pastTransactions.slice(-20);
  for (const t of recentPast) {
    const d = new Date(t.date);
    const tipo = t.type === 'income' ? '💚 Receita' : '🔴 Despesa';
    context += `- ${format(d, 'dd/MM/yyyy')}: ${t.description} - R$ ${t.amount} (${tipo} - ${t.category}) [${t.status || 'concluído'}]\n`;
  }

  context += `\n📆 TRANSAÇÕES FUTURAS (agendadas):\n`;
  for (const t of futureTransactions.slice(0, 30)) {
    const d = new Date(t.date);
    const tipo = t.type === 'income' ? '💚 Receita' : '🔴 Despesa';
    context += `- ${format(d, 'dd/MM/yyyy')}: ${t.description} - R$ ${t.amount} (${tipo} - ${t.category}) [${t.status || 'pendente'}]\n`;
  }

  const totalFutureExpenses = futureTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalFutureIncome = futureTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  context += `\nTotal de despesas futuras agendadas: R$ ${totalFutureExpenses.toFixed(2)}\n`;
  context += `Total de receitas futuras agendadas: R$ ${totalFutureIncome.toFixed(2)}\n`;

  // ========== CREDIT CARDS (with full invoice history) ==========
  context += `\n💳 CARTÕES DE CRÉDITO:\n`;
  
  for (const card of creditCards) {
    const purchases = await storage.getCreditPurchases(userId, card.id);
    const currentInvoiceMonth = getCurrentInvoiceMonth(card.closingDay);
    const annualFee = card.hasAnnualFee && card.annualFeeValue ? parseFloat(card.annualFeeValue) / 12 : 0;
    
    context += `\n📌 ${card.name}\n`;
    context += `   Limite: R$ ${card.creditLimit} | Fecha dia ${card.closingDay} | Vence dia ${card.dueDay}\n`;
    
    // Calculate invoices for past 2 months + current + future 12 months
    const invoiceMonths: { month: Date; total: number; items: string[] }[] = [];
    
    for (let offset = -2; offset <= 12; offset++) {
      const targetMonth = addMonths(currentInvoiceMonth, offset);
      let total = annualFee;
      const items: string[] = [];
      
      for (const purchase of purchases) {
        if (purchase.status !== 'active') continue;
        
        const purchaseDate = new Date(purchase.purchaseDate);
        const firstInstallmentMonth = getInvoiceCompetenceMonth(purchaseDate, card.closingDay);
        
        for (let i = 0; i < purchase.installments; i++) {
          const installmentMonth = addMonths(firstInstallmentMonth, i);
          
          if (installmentMonth.getMonth() === targetMonth.getMonth() && 
              installmentMonth.getFullYear() === targetMonth.getFullYear()) {
            const value = parseFloat(purchase.installmentValue);
            total += value;
            const label = purchase.installments > 1 ? ` (${i + 1}/${purchase.installments})` : '';
            items.push(`${purchase.description}${label}: R$ ${value.toFixed(2)}`);
          }
        }
      }
      
      if (total > 0 || offset === 0) {
        invoiceMonths.push({ month: targetMonth, total, items });
      }
    }
    
    // Check payments made
    const cardPayments = creditPayments.filter(p => p.creditCardId === card.id);
    const paidMonths: { [key: string]: number } = {};
    for (const p of cardPayments) {
      const key = `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
      paidMonths[key] = (paidMonths[key] || 0) + parseFloat(String(p.amount));
    }
    
    for (const inv of invoiceMonths) {
      const monthKey = `${inv.month.getFullYear()}-${String(inv.month.getMonth() + 1).padStart(2, '0')}`;
      const paid = paidMonths[monthKey] || 0;
      const dueMonth = addMonths(inv.month, 1);
      const dueDate = `${card.dueDay}/${String(dueMonth.getMonth() + 1).padStart(2, '0')}/${dueMonth.getFullYear()}`;
      const isCurrent = inv.month.getMonth() === currentInvoiceMonth.getMonth() && inv.month.getFullYear() === currentInvoiceMonth.getFullYear();
      const isPast = inv.month < currentInvoiceMonth;
      
      let status = '';
      if (isPast) {
        status = paid >= inv.total ? '✅ PAGA' : `⚠️ PENDENTE (pago R$ ${paid.toFixed(2)})`;
      } else if (isCurrent) {
        status = '📍 ATUAL';
      } else {
        status = '🔮 FUTURA';
      }
      
      context += `\n   Fatura ${monthNames[inv.month.getMonth()]}/${inv.month.getFullYear()}: R$ ${inv.total.toFixed(2)} - vence ${dueDate} ${status}\n`;
      
      // Show items for current and future invoices
      if (!isPast && inv.items.length > 0) {
        for (const item of inv.items.slice(0, 8)) {
          context += `      - ${item}\n`;
        }
        if (inv.items.length > 8) {
          context += `      ... e mais ${inv.items.length - 8} itens\n`;
        }
      }
    }
  }

  // Total of all card invoices
  let totalAllCardInvoices = 0;
  for (const card of creditCards) {
    const purchases = await storage.getCreditPurchases(userId, card.id);
    const currentInvoiceMonth = getCurrentInvoiceMonth(card.closingDay);
    const annualFee = card.hasAnnualFee && card.annualFeeValue ? parseFloat(card.annualFeeValue) / 12 : 0;
    
    for (let offset = 0; offset <= 12; offset++) {
      const targetMonth = addMonths(currentInvoiceMonth, offset);
      let total = annualFee;
      
      for (const purchase of purchases) {
        if (purchase.status !== 'active') continue;
        const purchaseDate = new Date(purchase.purchaseDate);
        const firstInstallmentMonth = getInvoiceCompetenceMonth(purchaseDate, card.closingDay);
        
        for (let i = 0; i < purchase.installments; i++) {
          const installmentMonth = addMonths(firstInstallmentMonth, i);
          if (installmentMonth.getMonth() === targetMonth.getMonth() && 
              installmentMonth.getFullYear() === targetMonth.getFullYear()) {
            total += parseFloat(purchase.installmentValue);
          }
        }
      }
      totalAllCardInvoices += total;
    }
  }
  
  context += `\n💳 TOTAL DE TODAS AS FATURAS (atual + 12 meses futuros): R$ ${totalAllCardInvoices.toFixed(2)}\n`;

  // ========== SUBSCRIPTIONS ==========
  context += `\n📱 ASSINATURAS RECORRENTES:\n`;
  for (const sub of subscriptions) {
    const card = creditCards.find(c => c.id === sub.creditCardId);
    const paymentInfo = card ? `Cartão ${card.name}` : (sub.paymentMethod || 'Não definido');
    const status = sub.isTrial ? '🎁 Em teste' : '✅ Ativa';
    context += `- ${sub.name}: R$ ${sub.price}/mês (dia ${sub.date}) - ${paymentInfo} ${status}\n`;
  }
  
  const monthlySubscriptionTotal = subscriptions
    .filter(s => !s.isTrial)
    .reduce((sum, s) => sum + parseFloat(s.price), 0);
  context += `Total mensal em assinaturas: R$ ${monthlySubscriptionTotal.toFixed(2)}\n`;

  // ========== VEHICLES ==========
  context += `\n🚗 VEÍCULOS:\n`;
  if (vehicles.length === 0) {
    context += `Nenhum veículo cadastrado.\n`;
  } else {
    for (const v of vehicles) {
      context += `- ${v.name} (${v.plate})\n`;
      
      // Get vehicle expenses from transactions
      const vehicleExpenses = transactions.filter(t => t.vehicleId === v.id);
      const pendingExpenses = vehicleExpenses.filter(t => new Date(t.date) >= now);
      const paidExpenses = vehicleExpenses.filter(t => new Date(t.date) < now);
      
      if (pendingExpenses.length > 0) {
        context += `  Despesas pendentes:\n`;
        for (const e of pendingExpenses.slice(0, 10)) {
          context += `    - ${format(new Date(e.date), 'dd/MM/yyyy')}: ${e.description} - R$ ${e.amount}\n`;
        }
      }
      
      const totalVehicleExpenses = vehicleExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      context += `  Total de despesas do veículo: R$ ${totalVehicleExpenses.toFixed(2)}\n`;
    }
  }

  // ========== GOALS ==========
  context += `\n🎯 METAS FINANCEIRAS:\n`;
  if (goals.length === 0) {
    context += `Nenhuma meta cadastrada.\n`;
  } else {
    for (const g of goals) {
      const current = parseFloat(g.current);
      const target = parseFloat(g.target);
      const progress = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
      context += `- ${g.name}: R$ ${current.toFixed(2)} / R$ ${target.toFixed(2)} (${progress}%)\n`;
    }
  }

  // ========== INVESTMENTS ==========
  context += `\n📈 INVESTIMENTOS:\n`;
  if (investments.length === 0) {
    context += `Nenhum investimento cadastrado.\n`;
  } else {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    for (const inv of investments) {
      const value = parseFloat(inv.value);
      totalInvested += value;
      totalCurrentValue += value;
      const yieldRate = inv.yieldRate ? parseFloat(inv.yieldRate) : 0;
      context += `- ${inv.name}: R$ ${value.toFixed(2)} | Rendimento: ${inv.yieldDisplay || 'N/A'}\n`;
    }
    context += `Total investido: R$ ${totalInvested.toFixed(2)}\n`;
    context += `Valor atual total: R$ ${totalCurrentValue.toFixed(2)}\n`;
    context += `Rendimento total: R$ ${(totalCurrentValue - totalInvested).toFixed(2)}\n`;
  }

  // ========== FINANCIAL PROJECTION ==========
  context += `\n📊 PROJEÇÃO FINANCEIRA:\n`;
  context += `Saldo atual: R$ ${totalBalance.toFixed(2)}\n`;
  context += `(-) Faturas de cartão (próximos 12 meses): R$ ${totalAllCardInvoices.toFixed(2)}\n`;
  context += `(-) Despesas agendadas (débito/pix): R$ ${totalFutureExpenses.toFixed(2)}\n`;
  context += `(+) Receitas agendadas: R$ ${totalFutureIncome.toFixed(2)}\n`;
  const projectedBalance = totalBalance - totalAllCardInvoices - totalFutureExpenses + totalFutureIncome;
  context += `= Saldo projetado: R$ ${projectedBalance.toFixed(2)}\n`;

  return context;
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await buildCompleteContext(userId);

  const today = new Date();
  const formattedToday = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça". Você tem ACESSO COMPLETO a TODOS os dados financeiros do usuário.

📅 HOJE: ${formattedToday}

${context}

INSTRUÇÕES:
1. Você tem ACESSO TOTAL ao passado, presente e futuro: saldo, extrato, cartões, faturas, assinaturas, veículos, metas, investimentos.
2. Quando o usuário perguntar sobre projeções, USE os dados detalhados acima para calcular.
3. Seja PRECISO com os valores. Cite números específicos.
4. Para projeção de saldo: considere todas as faturas futuras + despesas agendadas - receitas agendadas.
5. SEMPRE complete suas respostas. NUNCA corte no meio de uma frase ou lista.
6. Seja amigável e use emojis quando apropriado.
7. Se precisar fazer cálculos complexos, mostre o passo a passo.`;

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
