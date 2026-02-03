import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface OCRTransactionResult {
  amount: number | null;
  description: string | null;
  category: string | null;
  date: string | null;
  merchant: string | null;
  confidence: number;
  rawText: string;
}

export async function extractTransactionFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<OCRTransactionResult> {
  try {
    const prompt = `Você é um especialista em extrair informações de cupons fiscais, notas e recibos brasileiros.

Analise esta imagem e extraia as seguintes informações:
1. Valor total da compra (em reais)
2. Nome do estabelecimento/loja
3. Data da compra (formato YYYY-MM-DD)
4. Descrição resumida da compra
5. Categoria sugerida (escolha uma: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Investimento, Outros)

Responda APENAS com um JSON válido no formato:
{
  "amount": 123.45,
  "merchant": "Nome da Loja",
  "date": "2024-01-15",
  "description": "Compra no supermercado",
  "category": "Alimentação",
  "confidence": 0.95,
  "rawText": "Texto principal extraído da imagem"
}

Se não conseguir identificar algum campo, use null.
O campo confidence deve ser um número entre 0 e 1 indicando sua confiança na extração.`;

    const contents = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
      prompt,
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const responseText = response.text || "{}";
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]) as OCRTransactionResult;
    return result;
  } catch (error) {
    console.error("OCR extraction error:", error);
    return {
      amount: null,
      description: null,
      category: null,
      date: null,
      merchant: null,
      confidence: 0,
      rawText: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function transcribeVoiceCommand(
  audioBase64: string,
  mimeType: string = "audio/webm"
): Promise<{
  text: string;
  transaction: {
    amount: number | null;
    description: string | null;
    category: string | null;
    type: "income" | "expense" | null;
  };
}> {
  try {
    const prompt = `Você é um assistente financeiro que processa comandos de voz para registrar transações.

Primeiro, transcreva o áudio.
Depois, extraia as informações da transação:
1. Valor (em reais)
2. Descrição
3. Categoria sugerida (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Investimento, Outros)
4. Tipo (income = receita/entrada, expense = despesa/gasto)

Exemplos de comandos:
- "Gastei 50 reais no supermercado" → expense, 50, Alimentação
- "Recebi 1500 de salário" → income, 1500, Outros
- "Paguei 100 reais de luz" → expense, 100, Moradia

Responda APENAS com JSON:
{
  "text": "transcrição do áudio",
  "transaction": {
    "amount": 50.00,
    "description": "Supermercado",
    "category": "Alimentação",
    "type": "expense"
  }
}`;

    const contents = [
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType,
        },
      },
      prompt,
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    const responseText = response.text || "{}";
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Voice transcription error:", error);
    return {
      text: `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      transaction: {
        amount: null,
        description: null,
        category: null,
        type: null,
      },
    };
  }
}
