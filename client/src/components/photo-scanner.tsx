import { useState, useRef, useEffect, useMemo } from "react";
import { Camera, X, Loader2, Check, ImageIcon, Wallet, CreditCard, Banknote, ArrowRightLeft, FileText, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useFinancialStore } from "@/lib/store";

interface OCRResult {
  amount: number | null;
  description: string | null;
  category: string | null;
  date: string | null;
  merchant: string | null;
  confidence: number;
  rawText: string;
}

interface BatchTransaction {
  amount: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
  selected: boolean;
}

interface BatchResult {
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

interface PhotoScannerProps {
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
  "Compras",
  "Educação",
  "Investimento",
  "Lazer",
  "Moradia",
  "Outros",
  "Salário",
  "Saúde",
  "Serviços",
  "Transporte",
  "Uber",
  "Vendas"
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: ArrowRightLeft },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "transfer", label: "Transferência", icon: ArrowRightLeft },
];

type ScanMode = "single" | "batch";

export function PhotoScanner({ open, onOpenChange, accounts, creditCards = [], onTransactionExtracted, onCreditPurchaseExtracted }: PhotoScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("single");
  const [batchTransactions, setBatchTransactions] = useState<BatchTransaction[]>([]);
  const [batchProcessed, setBatchProcessed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editAccountId, setEditAccountId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("pix");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [isCredit, setIsCredit] = useState(false);
  const [editCardId, setEditCardId] = useState("");

  const [batchAccountId, setBatchAccountId] = useState("");
  const [batchPaymentMethod, setBatchPaymentMethod] = useState("pix");

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
    if (accounts && accounts.length > 0 && !batchAccountId) {
      setBatchAccountId(accounts[0].id);
    }
  }, [accounts, editAccountId, batchAccountId]);

  useEffect(() => {
    if (creditCards && creditCards.length > 0 && !editCardId) {
      setEditCardId(creditCards[0].id);
    }
  }, [creditCards, editCardId]);

  useEffect(() => {
    if (result) {
      setEditAmount(result.amount?.toString() || "");
      setEditDescription(result.merchant || result.description || "");
      setEditCategory(result.category || "Outros");
      if (result.date) {
        try {
          const dateStr = result.date.includes('T') ? result.date : `${result.date}T12:00:00`;
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            setEditDate(format(parsedDate, "yyyy-MM-dd"));
          }
        } catch {
          setEditDate(format(new Date(), "yyyy-MM-dd"));
        }
      }
    }
  }, [result]);

  const processImage = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const response = await apiClient<OCRResult>('/ocr', {
        method: 'POST',
        body: JSON.stringify({ image: base64, mimeType }),
      });
      
      setResult(response);

      if (response.rawText && /recebid[oa]|recebeu|cr[eé]dito recebido|pix recebido|transfer[eê]ncia recebida/i.test(response.rawText)) {
        setEditType("income");
      } else {
        setEditType("expense");
      }
      
      if (response.confidence > 0.5 && response.amount) {
        toast({ title: "Cupom lido com sucesso!" });
      } else {
        toast({ 
          title: "Leitura parcial", 
          description: "Alguns dados não puderam ser identificados",
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const processBatchImage = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const response = await apiClient<BatchResult>('/ocr-batch', {
        method: 'POST',
        body: JSON.stringify({ image: base64, mimeType }),
      });
      
      if (response.transactions && response.transactions.length > 0) {
        setBatchTransactions(response.transactions.map(t => ({ ...t, selected: true })));
        setBatchProcessed(true);
        toast({ title: `${response.transactions.length} transações encontradas!` });
      } else {
        toast({ 
          title: "Nenhuma transação encontrada", 
          description: "Tente com outra imagem ou use o modo cupom",
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Erro ao processar extrato", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      
      const base64 = dataUrl.split(',')[1];
      if (scanMode === "batch") {
        await processBatchImage(base64, file.type);
      } else {
        await processImage(base64, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleTransaction = (idx: number) => {
    setBatchTransactions(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const toggleAll = () => {
    const allSelected = batchTransactions.every(t => t.selected);
    setBatchTransactions(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  };

  const updateBatchTransaction = (idx: number, field: string, value: string) => {
    setBatchTransactions(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      if (field === 'amount') return { ...t, amount: parseFloat(value) || 0 };
      if (field === 'type') return { ...t, type: value as "income" | "expense" };
      return { ...t, [field]: value };
    }));
  };

  const confirmBatchTransactions = async () => {
    const selected = batchTransactions.filter(t => t.selected);
    if (selected.length === 0) {
      toast({ title: "Selecione ao menos uma transação", variant: "destructive" });
      return;
    }
    if (!batchAccountId) {
      toast({ title: "Selecione uma conta", variant: "destructive" });
      return;
    }

    setSavingBatch(true);
    let saved = 0;
    for (const t of selected) {
      try {
        onTransactionExtracted({
          amount: t.amount,
          description: t.description,
          category: t.category,
          type: t.type,
          date: t.date,
          accountId: batchAccountId,
          paymentMethod: batchPaymentMethod,
        });
        saved++;
      } catch (err) {
        console.error("Erro ao salvar transação:", err);
      }
    }

    toast({ title: `${saved} transações salvas com sucesso!` });
    setSavingBatch(false);
    resetState();
    onOpenChange(false);
  };

  const confirmTransaction = () => {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    if (isCredit) {
      if (!editCardId) {
        toast({ title: "Selecione um cartão", variant: "destructive" });
        return;
      }
      if (onCreditPurchaseExtracted) {
        onCreditPurchaseExtracted({
          amount,
          description: editDescription || "Compra via foto",
          category: editCategory || "Outros",
          date: editDate,
          creditCardId: editCardId,
        });
        resetState();
        onOpenChange(false);
        return;
      }
    }

    if (!editAccountId) {
      toast({ title: "Selecione uma conta", variant: "destructive" });
      return;
    }
    
    onTransactionExtracted({
      amount,
      description: editDescription || (editType === "income" ? "Recebimento via foto" : "Compra via foto"),
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
    setPreview(null);
    setResult(null);
    setBatchTransactions([]);
    setBatchProcessed(false);
    setExpandedIdx(null);
    setSavingBatch(false);
    setEditAmount("");
    setEditDescription("");
    setEditCategory("");
    setEditDate(format(new Date(), "yyyy-MM-dd"));
    setEditPaymentMethod("pix");
    setEditType("expense");
    setIsCredit(false);
    setEditCardId("");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const selectedCount = batchTransactions.filter(t => t.selected).length;
  const selectedTotal = batchTransactions.filter(t => t.selected).reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {scanMode === "batch" ? "Ler Extrato" : "Escanear Cupom"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !batchProcessed ? (
            <>
              {!preview && !isProcessing && (
                <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg mb-3">
                  <button
                    type="button"
                    data-testid="button-mode-single"
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${scanMode === 'single' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-500'}`}
                    onClick={() => setScanMode('single')}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Cupom
                  </button>
                  <button
                    type="button"
                    data-testid="button-mode-batch"
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${scanMode === 'batch' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-500'}`}
                    onClick={() => setScanMode('batch')}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Extrato
                  </button>
                </div>
              )}

              {preview && (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                        <p className="text-sm">
                          {scanMode === "batch" ? "Lendo extrato com IA..." : "Processando com IA..."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!preview && !isProcessing && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  
                  <Button
                    variant="outline"
                    className="h-32 flex flex-col gap-2"
                    onClick={() => cameraInputRef.current?.click()}
                    data-testid="button-camera-capture"
                  >
                    <Camera className="w-8 h-8 text-primary" />
                    <span>Tirar Foto</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-32 flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-gallery-upload"
                  >
                    <ImageIcon className="w-8 h-8 text-primary" />
                    <span>Galeria</span>
                  </Button>
                </div>
              )}

              <p className="text-center text-sm text-gray-500">
                {scanMode === "batch" 
                  ? "Tire uma foto do extrato bancário para importar várias transações de uma vez"
                  : "Tire uma foto do cupom fiscal ou nota para extrair os dados automaticamente"
                }
              </p>
            </>
          ) : batchProcessed ? (
            <div className="space-y-3">
              {preview && (
                <img src={preview} alt="Extrato" className="w-full h-24 object-cover rounded-lg opacity-70" />
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{batchTransactions.length} transações encontradas</span>
                <Button variant="ghost" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                  {batchTransactions.every(t => t.selected) ? (
                    <><CheckSquare className="w-4 h-4 mr-1" /> Desmarcar todas</>
                  ) : (
                    <><Square className="w-4 h-4 mr-1" /> Selecionar todas</>
                  )}
                </Button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {batchTransactions.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`border rounded-lg p-3 transition-all ${t.selected ? 'border-primary/50 bg-primary/5' : 'border-gray-200 dark:border-zinc-700 opacity-60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTransaction(idx)}
                        data-testid={`button-toggle-transaction-${idx}`}
                        className="shrink-0"
                      >
                        {t.selected ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{t.description}</span>
                          <span className={`text-sm font-bold whitespace-nowrap ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{t.date ? format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</span>
                          <span>•</span>
                          <span>{t.category}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        className="shrink-0 text-gray-400"
                      >
                        {expandedIdx === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {expandedIdx === idx && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={t.type} onValueChange={(v) => updateBatchTransaction(idx, 'type', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">Receita</SelectItem>
                                <SelectItem value="expense">Despesa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={t.amount}
                              onChange={(e) => updateBatchTransaction(idx, 'amount', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            value={t.description}
                            onChange={(e) => updateBatchTransaction(idx, 'description', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Categoria</Label>
                            <Select value={t.category} onValueChange={(v) => updateBatchTransaction(idx, 'category', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Data</Label>
                            <Input
                              type="date"
                              value={t.date}
                              onChange={(e) => updateBatchTransaction(idx, 'date', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{selectedCount} selecionadas</span>
                  <span className={`font-bold ${selectedTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Saldo: R$ {selectedTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Conta destino</Label>
                    <Select value={batchAccountId} onValueChange={setBatchAccountId}>
                      <SelectTrigger data-testid="select-batch-account">
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
                    <Select value={batchPaymentMethod} onValueChange={setBatchPaymentMethod}>
                      <SelectTrigger data-testid="select-batch-payment">
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
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                  data-testid="button-retry-batch"
                >
                  <X className="w-4 h-4 mr-1" />
                  Nova Foto
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmBatchTransactions}
                  disabled={savingBatch || selectedCount === 0}
                  data-testid="button-confirm-batch"
                >
                  {savingBatch ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Salvar {selectedCount}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="Cupom" className="w-full h-32 object-cover rounded-lg" />
              )}
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      type="button"
                      data-testid="button-type-income"
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${editType === 'income' ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600' : 'text-gray-500'}`}
                      onClick={() => setEditType('income')}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      data-testid="button-type-expense"
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${editType === 'expense' ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600' : 'text-gray-500'}`}
                      onClick={() => setEditType('expense')}
                    >
                      Despesa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <Label className="text-xs">Descrição / Estabelecimento</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição da compra"
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
                </div>

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
                      Conta
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

                {isCredit && creditCards.length > 0 ? (
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
                ) : (
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
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                  data-testid="button-retry-photo"
                >
                  <X className="w-4 h-4 mr-1" />
                  Nova Foto
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmTransaction}
                  data-testid="button-confirm-photo"
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
