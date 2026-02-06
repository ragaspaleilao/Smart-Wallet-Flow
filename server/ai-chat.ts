import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

async function buildCompleteContext(userId: string): Promise<string> {
  const [accounts, transactions, goals] = await Promise.all([
    storage.getAccounts(userId),
    storage.getTransactions(userId),
    storage.getGoals(userId),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
  
  let context = `💰 SALDO ATUAL: R$ ${totalBalance.toFixed(2)}\n`;
  context += `CONTAS: ${accounts.map(a => `${a.name}: R$${a.balance}`).join(', ')}\n`;

  const recentTransactions = transactions.slice(-8);
  context += `\n📅 ÚLTIMAS MOVIMENTAÇÕES (Extrato):\n`;
  for (const t of recentTransactions) {
    const tipoLabel = t.type === 'income' ? '🟢 RECEBIMENTO' : '🔴 DESPESA';
    context += `- ${tipoLabel}: ${t.description} (R$ ${t.amount})\n`;
  }

  context += `\n🎯 METAS: `;
  context += goals.map(g => `${g.name} (${((parseFloat(g.current)/parseFloat(g.target))*100).toFixed(0)}%)`).join(', ');

  return context;
}

export async function processAiChat(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await buildCompleteContext(userId);
  const formattedToday = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  const systemPrompt = `Você é o Mentor Financeiro do app "Xô Preguiça". 
Sua tarefa é analisar o extrato abaixo e responder ao usuário.

📅 HOJE: ${formattedToday}
${context}

REGRAS CRÍTICAS:
1. Diferencie 🟢 RECEBIMENTO (dinheiro entrando) de 🔴 DESPESA (dinheiro saindo).
2. Se o usuário recebeu dinheiro (ex: Uber, Salário), parabenize. Não sugira economizar em algo que foi ganho.
3. Responda de forma curta (máximo 3 parágrafos).
4. Seja preciso com os valores apresentados no extrato acima.`;

  const historyText = conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');
  const fullPrompt = `${systemPrompt}\n\n${historyText}\nUsuário: ${message}`;

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: {
        temperature: 0.2,
        maxOutputTokens: 800,
      }
    });

    return result.text || "Não consegui ler os dados agora. Pode repetir?";
  } catch (error: any) {
    return "Estou processando muitos dados. Tente em 1 minuto!";
  }
}
