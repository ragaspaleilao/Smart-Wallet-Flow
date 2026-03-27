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

export interface OCRBatchResult {
  transactions: Array<{
    amount: number;
    description: string;
    category: string;
    date: string;
    type: "income" | "expense";
  }>;
  totalFound: number;
  confidence: number;
  rawText: string;
}

export async function extractTransactionFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<OCRTransactionResult> {
  try {
    const currentYear = new Date().getFullYear();
    const prompt = `Extraia os dados deste cupom fiscal para JSON puro.
Categorias: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Investimento, Outros.
Formato de data: YYYY-MM-DD. O ano atual é ${currentYear}, use-o nas datas.

Responda APENAS o JSON:
{
  "amount": 0.0,
  "merchant": "Nome",
  "date": "${currentYear}-MM-DD",
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

export async function extractMultipleTransactions(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<OCRBatchResult> {
  try {
    const currentYear = new Date().getFullYear();
    const prompt = `Analise esta imagem de extrato bancário ou lista de transações.
Extraia TODAS as transações visíveis na imagem.

IMPORTANTE: O ano atual é ${currentYear}. Use sempre ${currentYear} nas datas, a menos que o extrato mostre explicitamente outro ano.

Para cada transação, identifique:
- amount: valor numérico (sempre positivo, sem sinal)
- description: descrição ou nome do pagador/recebedor
- category: uma das categorias (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Serviços, Investimento, Salário, Vendas, Outros)
- date: data no formato YYYY-MM-DD (use o ano ${currentYear})
- type: "income" se é entrada/crédito/recebimento (valores com +), "expense" se é saída/débito/pagamento (valores com -)

Dicas para identificar o tipo:
- Valores com "+" ou "crédito" ou "recebido" ou "transferência recebida" = income
- Valores com "-" ou "débito" ou "pago" ou "pagamento" = expense
- Pix recebido = income, Pix enviado = expense

Responda APENAS o JSON:
{
  "transactions": [
    {"amount": 0.00, "description": "Descrição", "category": "Categoria", "date": "${currentYear}-MM-DD", "type": "income"},
    {"amount": 0.00, "description": "Descrição", "category": "Categoria", "date": "${currentYear}-MM-DD", "type": "expense"}
  ],
  "totalFound": 0,
  "confidence": 0.0,
  "rawText": "texto extraído resumido"
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
        maxOutputTokens: 4000,
      }
    });

    const responseText = response.text || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]) as OCRBatchResult;
    
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error("Formato inválido");
    }

    parsed.transactions = parsed.transactions.filter(t => t.amount && t.amount > 0);

    // Correct any dates with wrong year (model hallucination)
    parsed.transactions = parsed.transactions.map(t => {
      if (t.date) {
        const dateYear = parseInt(t.date.substring(0, 4), 10);
        if (dateYear < currentYear - 1 || dateYear > currentYear + 1) {
          t.date = `${currentYear}${t.date.substring(4)}`;
        }
      }
      return t;
    });

    parsed.totalFound = parsed.transactions.length;
    
    return parsed;

  } catch (error) {
    console.error("Erro no OCR batch:", error);
    return { transactions: [], totalFound: 0, confidence: 0, rawText: "Erro na leitura" };
  }
}

export interface CreditCardInvoiceResult {
  purchases: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
    installments: number;
    currentInstallment: number;
    totalAmount: number;
  }>;
  totalFound: number;
  invoiceTotal: number;
  confidence: number;
  rawText: string;
}

export async function extractCreditCardInvoice(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<CreditCardInvoiceResult> {
  try {
    const currentYear = new Date().getFullYear();
    const prompt = `Analise esta imagem de fatura de cartão de crédito.
Extraia TODAS as compras/lançamentos visíveis na fatura.

IMPORTANTE: O ano atual é ${currentYear}. Use ${currentYear} para as datas, a menos que a fatura explicitamente mostre outro ano.

Para cada compra, identifique:
- description: nome do estabelecimento ou descrição da compra
- amount: valor cobrado nesta fatura (o valor da parcela, não o total)
- category: uma das categorias (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Compras, Serviços, Assinatura, Outros)
- date: data da compra no formato YYYY-MM-DD (use o ano ${currentYear})
- installments: número total de parcelas (1 se à vista)
- currentInstallment: parcela atual (ex: se é "Parcela 1 de 3", currentInstallment = 1; se é "3/10", currentInstallment = 3)
- totalAmount: valor total da compra (se parcelado, amount x installments; se à vista, igual ao amount)

Dicas para identificar parcelas:
- Textos como "PARC 3/10", "3 de 10", "03/10", "parcela 3 de 10", "Parcela 1 de 3" indicam parcelamento
- Se não houver indicação de parcela, considere installments = 1 e currentInstallment = 1
- O valor mostrado na fatura é o valor da parcela (amount), não o total

Responda APENAS o JSON:
{
  "purchases": [
    {"description": "Loja X", "amount": 50.00, "category": "Compras", "date": "${currentYear}-01-15", "installments": 10, "currentInstallment": 3, "totalAmount": 500.00},
    {"description": "Restaurante Y", "amount": 45.90, "category": "Alimentação", "date": "${currentYear}-01-20", "installments": 1, "currentInstallment": 1, "totalAmount": 45.90}
  ],
  "totalFound": 2,
  "invoiceTotal": 95.90,
  "confidence": 0.85,
  "rawText": "texto extraído resumido"
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
        maxOutputTokens: 6000,
      }
    });

    const responseText = response.text || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]) as CreditCardInvoiceResult;
    
    if (!parsed.purchases || !Array.isArray(parsed.purchases)) {
      throw new Error("Formato inválido");
    }

    parsed.purchases = parsed.purchases
      .filter(p => p.amount && p.amount > 0)
      .map(p => {
        if (p.date) {
          const dateYear = parseInt(p.date.substring(0, 4), 10);
          if (dateYear < currentYear - 1 || dateYear > currentYear + 1) {
            p.date = `${currentYear}${p.date.substring(4)}`;
          }
        }
        return p;
      });
    parsed.totalFound = parsed.purchases.length;
    parsed.invoiceTotal = parsed.purchases.reduce((sum, p) => sum + p.amount, 0);
    
    return parsed;

  } catch (error) {
    console.error("Erro no OCR fatura:", error);
    return { purchases: [], totalFound: 0, invoiceTotal: 0, confidence: 0, rawText: "Erro na leitura" };
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
