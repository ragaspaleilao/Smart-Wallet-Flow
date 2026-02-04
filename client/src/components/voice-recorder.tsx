import { useState, useRef, useEffect, useMemo } from "react";
import { Mic, Square, Loader2, Check, X, Calendar, Wallet, CreditCard, Banknote, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useFinancialStore } from "@/lib/store";

interface VoiceResult {
  text: string;
  transaction: {
    amount: number | null;
    description: string | null;
    category: string | null;
    type: "income" | "expense" | null;
  };
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface CreditCard {
  id: string;
  name: string;
  brand: string;
  closingDay: number;
}

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  creditCards?: CreditCard[];
  onTransactionExtracted: (data: {
    amount: number;
    description: string;
    category: string;
    type: "income" | "expense";
    date: string;
    accountId: string;
    paymentMethod: string;
  }) => void;
  onCreditPurchaseExtracted?: (data: {
    amount: number;
    description: string;
    category: string;
    date: string;
    creditCardId: string;
  }) => void;
}

const DEFAULT_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Serviços",
  "Salário",
  "Freelance",
  "Investimentos",
  "Outros"
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: ArrowRightLeft },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "transfer", label: "Transferência", icon: ArrowRightLeft },
];

export function VoiceRecorder({ open, onOpenChange, accounts, creditCards = [], onTransactionExtracted, onCreditPurchaseExtracted }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editDate, setEditDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editAccountId, setEditAccountId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("pix");
  const [isCredit, setIsCredit] = useState(false);
  const [editCardId, setEditCardId] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use shared categories from store
  const storeCategories = useFinancialStore((s) => s.transactionCategories);
  const categories = useMemo(() => {
    const combined = [...(storeCategories || []), ...DEFAULT_CATEGORIES];
    const unique = Array.from(new Set(combined));
    return unique.filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [storeCategories]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !editAccountId) {
      setEditAccountId(accounts[0].id);
    }
  }, [accounts, editAccountId]);

  useEffect(() => {
    if (creditCards && creditCards.length > 0 && !editCardId) {
      setEditCardId(creditCards[0].id);
    }
  }, [creditCards, editCardId]);

  useEffect(() => {
    if (result?.transaction) {
      setEditAmount(result.transaction.amount?.toString() || "");
      setEditDescription(result.transaction.description || "");
      setEditCategory(result.transaction.category || "Outros");
      setEditType(result.transaction.type || "expense");
    }
  }, [result]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (error) {
      toast({ 
        title: "Erro ao acessar microfone", 
        description: "Verifique as permissões do navegador",
        variant: "destructive" 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const response = await apiClient<VoiceResult>('/voice', {
          method: 'POST',
          body: JSON.stringify({ audio: base64, mimeType: 'audio/webm' }),
        });
        
        setResult(response);
        
        if (response.transaction.amount) {
          toast({ title: "Comando reconhecido!" });
        } else {
          toast({ 
            title: "Não consegui entender", 
            description: "Tente novamente com mais clareza",
            variant: "destructive" 
          });
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      toast({ 
        title: "Erro ao processar áudio", 
        description: "Tente novamente",
        variant: "destructive" 
      });
      setIsProcessing(false);
    }
  };

  const confirmTransaction = () => {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    // Credit card purchase
    if (isCredit) {
      if (!editCardId) {
        toast({ title: "Selecione um cartão", variant: "destructive" });
        return;
      }
      if (onCreditPurchaseExtracted) {
        onCreditPurchaseExtracted({
          amount,
          description: editDescription || "Compra por voz",
          category: editCategory || "Outros",
          date: editDate,
          creditCardId: editCardId,
        });
        resetState();
        onOpenChange(false);
        return;
      }
    }

    // Regular transaction
    if (!editAccountId) {
      toast({ title: "Selecione uma conta", variant: "destructive" });
      return;
    }
    
    onTransactionExtracted({
      amount,
      description: editDescription || "Transação por voz",
      category: editCategory || "Outros",
      type: editType,
      date: editDate,
      accountId: editAccountId,
      paymentMethod: editPaymentMethod,
    });
    
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setResult(null);
    setRecordingTime(0);
    setEditAmount("");
    setEditDescription("");
    setEditCategory("");
    setEditType("expense");
    setEditDate(format(new Date(), "yyyy-MM-dd"));
    setEditPaymentMethod("pix");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Comando de Voz
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Diga algo como: "Gastei 50 reais no supermercado" ou "Recebi 1500 de salário"
              </div>

              <div className="flex flex-col items-center gap-4 py-6">
                {isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Processando áudio com IA...</p>
                  </div>
                ) : isRecording ? (
                  <>
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                        <Mic className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                        {formatTime(recordingTime)}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={stopRecording}
                      className="mt-4"
                      data-testid="button-stop-recording"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Parar Gravação
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="w-24 h-24 rounded-full"
                      onClick={startRecording}
                      data-testid="button-start-recording"
                    >
                      <Mic className="w-10 h-10" />
                    </Button>
                    <p className="text-gray-500 text-sm">Toque para gravar</p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-3">
                <span className="text-gray-500 text-xs">Você disse:</span>
                <p className="font-medium italic text-sm">"{result.text}"</p>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={editType} onValueChange={(v) => setEditType(v as "income" | "expense")}>
                      <SelectTrigger data-testid="select-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">📉 Despesa</SelectItem>
                        <SelectItem value="income">📈 Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0,00"
                      data-testid="input-amount"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição da transação"
                    data-testid="input-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      data-testid="input-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Conta</Label>
                    <Select value={editAccountId} onValueChange={setEditAccountId}>
                      <SelectTrigger data-testid="select-account">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center gap-2">
                              <Wallet className="w-3 h-3" />
                              {acc.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Forma de Pagamento</Label>
                    <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.filter(m => m.value !== 'credit').map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <method.icon className="w-3 h-3" />
                              {method.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Toggle between Debit/Account and Credit Card */}
                {creditCards.length > 0 && onCreditPurchaseExtracted && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-zinc-900 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setIsCredit(false)}
                      className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                        !isCredit 
                        ? 'bg-white dark:bg-zinc-800 shadow-sm text-primary' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      Débito/Conta
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCredit(true)}
                      className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                        isCredit 
                        ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Crédito
                    </button>
                  </div>
                )}

                {isCredit && creditCards.length > 0 && (
                  <div>
                    <Label className="text-xs">Cartão de Crédito</Label>
                    <Select value={editCardId} onValueChange={setEditCardId}>
                      <SelectTrigger data-testid="select-credit-card">
                        <SelectValue placeholder="Selecione o cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3 h-3" />
                              {card.name} (Dia {card.closingDay})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                  data-testid="button-retry-voice"
                >
                  <X className="w-4 h-4 mr-1" />
                  Gravar Novamente
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmTransaction}
                  data-testid="button-confirm-voice"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
