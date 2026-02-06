import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODELO_ECONOMICO = "gemini-2.0-flash";

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
    const prompt = `Extraia os dados deste cupom fiscal para JSON puro.
Categorias: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Investimento, Outros.
Formato de data: YYYY-MM-DD.

Responda APENAS o JSON:
{
  "amount": 0.0,
  "merchant": "Nome",
  "date": "YYYY-MM-DD",
  "description": "Resumo",
  "category": "Categoria",
  "confidence": 0.0,
  "rawText": "texto extraído"
}`;

    const contents = [
      { inlineData: { data: imageBase64, mimeType } },
      { text: prompt }
    ];

    const response = await ai.models.generateContent({
      model: MODELO_ECONOMICO,
      contents: contents,
      config: {
        temperature: 0.1,
        maxOutputTokens: 500,
      }
    });

    const responseText = response.text || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("JSON não encontrado");
    return JSON.parse(jsonMatch[0]) as OCRTransactionResult;

  } catch (error) {
    console.error("Erro no OCR:", error);
    return { amount: null, description: null, category: null, date: null, merchant: null, confidence: 0, rawText: "Erro na leitura" };
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
    const prompt = `Transcreva o áudio e extraia a transação para JSON.
Tipos: income (receita) ou expense (despesa).
Categorias: Alimentação, Transporte, Moradia, Saúde, Lazer, Outros.

Responda APENAS JSON:
{
  "text": "transcrição",
  "transaction": {"amount": 0.0, "description": "", "category": "", "type": "expense"}
}`;

    const contents = [
      { inlineData: { data: audioBase64, mimeType } },
      { text: prompt }
    ];

    const response = await ai.models.generateContent({
      model: MODELO_ECONOMICO,
      contents: contents,
      config: {
        temperature: 0.1,
        maxOutputTokens: 400,
      }
    });

    const responseText = response.text || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("JSON não encontrado");
    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error("Erro na Voz:", error);
    return { text: "Erro ao ouvir", transaction: { amount: null, description: null, category: null, type: null } };
  }
}
