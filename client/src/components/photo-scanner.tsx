import { useState, useRef, useEffect, useMemo } from "react";
import { Camera, X, Loader2, Check, ImageIcon, Wallet, CreditCard, Banknote, ArrowRightLeft } from "lucide-react";
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
  "Outros"
];

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", icon: ArrowRightLeft },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "transfer", label: "Transferência", icon: ArrowRightLeft },
];

export function PhotoScanner({ open, onOpenChange, accounts, creditCards = [], onTransactionExtracted, onCreditPurchaseExtracted }: PhotoScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editAccountId, setEditAccountId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("pix");
  const [isCredit, setIsCredit] = useState(false);
  const [editCardId, setEditCardId] = useState("");

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
    if (result) {
      setEditAmount(result.amount?.toString() || "");
      setEditDescription(result.merchant || result.description || "");
      setEditCategory(result.category || "Outros");
      if (result.date) {
        try {
          const parsedDate = new Date(result.date);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      
      const base64 = dataUrl.split(',')[1];
      await processImage(base64, file.type);
    };
    reader.readAsDataURL(file);
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

    // Regular transaction
    if (!editAccountId) {
      toast({ title: "Selecione uma conta", variant: "destructive" });
      return;
    }
    
    onTransactionExtracted({
      amount,
      description: editDescription || "Compra via foto",
      category: editCategory || "Outros",
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
    setEditAmount("");
    setEditDescription("");
    setEditCategory("");
    setEditDate(format(new Date(), "yyyy-MM-dd"));
    setEditPaymentMethod("pix");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escanear Cupom
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              {preview && (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Processando com IA...</p>
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
                Tire uma foto do cupom fiscal ou nota para extrair os dados automaticamente
              </p>
            </>
          ) : (
            <div className="space-y-4">
              {preview && (
                <img src={preview} alt="Cupom" className="w-full h-32 object-cover rounded-lg" />
              )}
              
              <div className="space-y-3">
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
