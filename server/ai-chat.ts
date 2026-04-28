import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

async function buildCompleteContext(userId: string): Promise<string> {
  const [accounts, transactions, goals, creditCards] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getGoals(userId),
    storage.getCreditCards(userId),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  const lines: string[] = [];
  lines.push(`Saldo: R$ ${totalBalance.toFixed(2)}`);

  const recent = transactions.slice(-5);
  if (recent.length > 0) {
    const movs = recent
      .map(t => `${t.type === 'income' ? '+' : '-'}R$ ${t.amount} ${t.description}`)
      .join('; ');
    lines.push(`Últimas movimentações: ${movs}`);
  }

  if (creditCards.length > 0) {
    const cardLines: string[] = [];
    for (const card of creditCards) {
      const purchases = await storage.getCreditPurchases(userId, card.id);
      let faturaAtual = 0;
      let proximasFaturas = 0;
      for (const p of purchases) {
        if (p.status === 'active') {
          faturaAtual += parseFloat(p.installmentValue);
          if (p.installments > 1) proximasFaturas += parseFloat(p.installmentValue) * (p.installments - 1);
        }
      }
      let line = `${card.name}: fatura R$ ${faturaAtual.toFixed(2)} (limite ${card.creditLimit}, vence dia ${card.dueDay})`;
      if (proximasFaturas > 0) line += ` | parcelas futuras R$ ${proximasFaturas.toFixed(2)}`;
      cardLines.push(line);
    }
    lines.push(`Cartões: ${cardLines.join(' || ')}`);
  }

  if (goals.length > 0) {
    const metas = goals
      .map(g => `${g.name} ${((parseFloat(g.current) / parseFloat(g.target)) * 100).toFixed(0)}%`)
      .join(', ');
    lines.push(`Metas: ${metas}`);
  }

  return lines.join('\n');
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await buildCompleteContext(userId);
  const formattedToday = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const systemPrompt = `Você é o mentor financeiro do app "Finanças Fácil". Responda em português, de forma curta, direta e prática (sem encheção).

Hoje: ${formattedToday}
${context}

Diretrizes:
- Responda primeiro o que o usuário perguntou.
- Só alerte sobre cartão, parcelas ou metas se for relevante à pergunta ou houver risco real (ex.: fatura acima de 50% do saldo).
- Use apenas os números do contexto, nunca invente valores.
- Máximo 4 frases, salvo se o usuário pedir detalhe.`;

  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Usuário' : 'Mentor'}: ${m.content}`)
    .join('\n');

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${historyText}\nUsuário: ${message}` }] }],
      config: { temperature: 0.4, maxOutputTokens: 400 }
    });
    return result.text || "Não consegui analisar agora.";
  } catch (error) {
    return "Erro ao processar sua análise financeira.";
  }
}
