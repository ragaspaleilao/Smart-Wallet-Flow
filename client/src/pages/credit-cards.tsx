import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Settings,
  CreditCard as CreditCardIcon, 
  Plus, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  ShoppingBag,
  Landmark,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Check,
  BarChart2,
  Mic,
  Camera,
  Bell,
  MoreVertical,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { useFinancialStore, CreditCard, CreditPurchase } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { format, addMonths, setDate, isAfter, isBefore, startOfDay, endOfDay, addDays, parseISO, startOfMonth, isSameMonth } from "date-fns";

// Helper function to parse dates without timezone issues
// Always extracts YYYY-MM-DD and adds T12:00:00 to avoid timezone shifts
const parseDateSafe = (dateStr: string): Date => {
  const dateOnly = dateStr.slice(0, 10);
  return parseISO(`${dateOnly}T12:00:00`);
};
import { useCreditCards, useCreditPurchases, useCreditPayments, useCreateCreditCard, useCreateCreditPurchase, useUpdateCreditPurchase, useCreateCreditPayment, useDeleteCreditCard, useDeleteCreditPurchase, useAccounts, useUpdateCreditCard, useSubscriptions } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function ManageInlineCategories({
  scope,
  categories,
  onAdd,
  onRemove,
}: {
  scope: 'credit';
  categories: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const cleaned = value.trim();
    if (!cleaned) return;
    onAdd(cleaned);
    setValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex: Farmácia, Mercado, Viagem"
          data-testid={`input-${scope}-category-new`}
        />
        <Button onClick={handleAdd} data-testid={`button-${scope}-category-add`}>
          Adicionar
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="p-4 text-sm text-gray-500" data-testid={`text-${scope}-categories-empty`}>
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  data-testid={`row-${scope}-category-${cat}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate" data-testid={`text-${scope}-category-${cat}`}>
                      {cat}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => onRemove(cat)}
                    data-testid={`button-${scope}-category-remove-${cat}`}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500" data-testid={`text-${scope}-category-tip`}>
        Dica: categorias aqui s\u00f3 afetam compras no cart\u00e3o.
      </p>
    </div>
  );
}

interface InvoicePurchase {
  description: string;
  amount: number;
  category: string;
  date: string;
  installments: number;
  currentInstallment: number;
  totalAmount: number;
  selected: boolean;
}

function CreditCardPhotoScanner({ cardId, onPurchaseCreated, createPurchase }: { 
  cardId: string; 
  onPurchaseCreated: () => void;
  createPurchase: any;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"receipt" | "invoice">("receipt");
  const [result, setResult] = useState<{ amount: number | null; description: string | null; category: string | null; date: string | null; merchant: string | null } | null>(null);
  const [invoicePurchases, setInvoicePurchases] = useState<InvoicePurchase[]>([]);
  const [invoiceProcessed, setInvoiceProcessed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("Outros");
  const [editDate, setEditDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editInstallments, setEditInstallments] = useState("1");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Compras", "Vestuário", "Serviços", "Assinatura", "Outros"];

  const processReceiptImage = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setEditAmount(data.amount?.toString() || "");
        setEditDescription(data.merchant || data.description || "");
        setEditCategory(data.category || "Outros");
        if (data.date) {
          try {
            const dateStr = data.date.includes('T') ? data.date : `${data.date}T12:00:00`;
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              setEditDate(format(parsedDate, "yyyy-MM-dd"));
            }
          } catch {
            setEditDate(format(new Date(), "yyyy-MM-dd"));
          }
        }
      }
    } catch (error) {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const processInvoiceImage = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/ocr-credit-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.purchases && data.purchases.length > 0) {
          setInvoicePurchases(data.purchases.map((p: any) => ({ ...p, selected: true })));
          setInvoiceProcessed(true);
          toast({ title: `${data.purchases.length} compras encontradas na fatura!` });
        } else {
          toast({ title: "Nenhuma compra encontrada", description: "Tente com outra imagem", variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Erro ao processar fatura", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      if (scanMode === "invoice") {
        processInvoiceImage(base64, file.type);
      } else {
        processReceiptImage(base64, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    const amount = parseFloat(editAmount);
    if (!amount || !cardId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const installments = parseInt(editInstallments) || 1;
    const installmentValue = amount / installments;
    createPurchase.mutate({
      creditCardId: cardId,
      description: editDescription || "Compra via recibo",
      totalAmount: String(amount),
      installments,
      installmentValue: String(installmentValue),
      purchaseDate: editDate,
      category: editCategory
    }, {
      onSuccess: () => {
        toast({ title: "Compra lançada!", description: `${editDescription} - ${formatCurrency(amount)}` });
        onPurchaseCreated();
      },
      onError: (error: any) => {
        toast({ title: "Erro ao lançar compra", description: String(error), variant: "destructive" });
      }
    });
  };

  const togglePurchase = (idx: number) => {
    setInvoicePurchases(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const toggleAllPurchases = () => {
    const allSelected = invoicePurchases.every(p => p.selected);
    setInvoicePurchases(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const updateInvoicePurchase = (idx: number, field: string, value: string) => {
    setInvoicePurchases(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      if (field === 'amount') return { ...p, amount: parseFloat(value) || 0 };
      if (field === 'installments') return { ...p, installments: parseInt(value) || 1 };
      if (field === 'totalAmount') return { ...p, totalAmount: parseFloat(value) || 0 };
      return { ...p, [field]: value };
    }));
  };

  const confirmInvoicePurchases = async () => {
    const selected = invoicePurchases.filter(p => p.selected);
    if (selected.length === 0) {
      toast({ title: "Selecione ao menos uma compra", variant: "destructive" });
      return;
    }

    setSavingBatch(true);
    let saved = 0;
    let failed = 0;
    
    for (const p of selected) {
      try {
        const installments = p.installments || 1;
        const installmentValue = p.amount;
        const totalAmount = p.totalAmount && p.totalAmount >= p.amount 
          ? p.totalAmount 
          : installmentValue * installments;

        await new Promise<void>((resolve, reject) => {
          createPurchase.mutate({
            creditCardId: cardId,
            description: p.description,
            totalAmount: String(totalAmount),
            installments,
            installmentValue: String(installmentValue),
            purchaseDate: p.date,
            category: p.category || "Outros"
          }, {
            onSuccess: () => { saved++; resolve(); },
            onError: (error: any) => { failed++; reject(error); }
          });
        });
      } catch (err) {
        console.error("Erro ao salvar compra:", err);
      }
    }

    if (failed > 0) {
      toast({ title: `${saved} salvas, ${failed} falharam`, variant: "destructive" });
    } else {
      toast({ title: `${saved} compras lançadas no cartão!` });
    }
    setSavingBatch(false);
    resetState();
    onPurchaseCreated();
  };

  const resetState = () => {
    setPreview(null);
    setResult(null);
    setInvoicePurchases([]);
    setInvoiceProcessed(false);
    setExpandedIdx(null);
    setSavingBatch(false);
    setEditAmount("");
    setEditDescription("");
    setEditCategory("Outros");
    setEditDate(format(new Date(), "yyyy-MM-dd"));
    setEditInstallments("1");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const selectedCount = invoicePurchases.filter(p => p.selected).length;
  const selectedTotal = invoicePurchases.filter(p => p.selected).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {!preview && !invoiceProcessed ? (
        <div className="flex flex-col gap-3">
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button
              type="button"
              data-testid="button-cc-mode-receipt"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${scanMode === 'receipt' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-500'}`}
              onClick={() => setScanMode('receipt')}
            >
              <Receipt className="w-3.5 h-3.5" />
              Recibo
            </button>
            <button
              type="button"
              data-testid="button-cc-mode-invoice"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${scanMode === 'invoice' ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-500'}`}
              onClick={() => setScanMode('invoice')}
            >
              <CreditCardIcon className="w-3.5 h-3.5" />
              Fatura
            </button>
          </div>

          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" />
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => cameraInputRef.current?.click()} data-testid="button-cc-camera">
              <Camera className="w-8 h-8 text-primary" />
              <span className="text-xs">Tirar Foto</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()} data-testid="button-cc-gallery">
              <Receipt className="w-8 h-8 text-primary" />
              <span className="text-xs">Galeria</span>
            </Button>
          </div>
          
          <p className="text-center text-sm text-gray-500">
            {scanMode === "invoice" 
              ? "Tire uma foto da fatura do cartão para importar todas as compras, incluindo parceladas"
              : "Tire uma foto do recibo ou cupom fiscal para lançar no cartão"
            }
          </p>
        </div>
      ) : invoiceProcessed ? (
        <div className="space-y-3">
          {preview && (
            <img src={preview} alt="Fatura" className="w-full h-24 object-cover rounded-lg opacity-70" />
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{invoicePurchases.length} compras encontradas</span>
            <Button variant="ghost" size="sm" onClick={toggleAllPurchases} data-testid="button-cc-toggle-all">
              {invoicePurchases.every(p => p.selected) ? "Desmarcar todas" : "Selecionar todas"}
            </Button>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {invoicePurchases.map((p, idx) => (
              <div 
                key={idx} 
                className={`border rounded-lg p-3 transition-all ${p.selected ? 'border-primary/50 bg-primary/5' : 'border-gray-200 dark:border-zinc-700 opacity-60'}`}
              >
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => togglePurchase(idx)} className="shrink-0" data-testid={`button-cc-toggle-${idx}`}>
                    {p.selected ? (
                      <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{p.description}</span>
                      <span className="text-sm font-bold text-red-600 whitespace-nowrap ml-2">
                        R$ {p.amount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{p.date ? format(new Date(p.date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</span>
                      <span>•</span>
                      <span>{p.category}</span>
                      {p.installments > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            {p.currentInstallment}/{p.installments}x
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {expandedIdx === idx && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={p.description}
                        onChange={(e) => updateInvoicePurchase(idx, 'description', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Valor parcela</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.amount}
                          onChange={(e) => updateInvoicePurchase(idx, 'amount', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valor total</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.totalAmount}
                          onChange={(e) => updateInvoicePurchase(idx, 'totalAmount', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Categoria</Label>
                        <Select value={p.category} onValueChange={(v) => updateInvoicePurchase(idx, 'category', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Parcelas</Label>
                        <Select value={String(p.installments)} onValueChange={(v) => updateInvoicePurchase(idx, 'installments', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36,48].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Data</Label>
                        <Input
                          type="date"
                          value={p.date}
                          onChange={(e) => updateInvoicePurchase(idx, 'date', e.target.value)}
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
              <span className="font-bold text-red-600">
                Total: R$ {selectedTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetState} className="flex-1" data-testid="button-cc-retry">
                Nova Foto
              </Button>
              <Button 
                onClick={confirmInvoicePurchases} 
                disabled={savingBatch || selectedCount === 0} 
                className="flex-1"
                data-testid="button-cc-confirm-batch"
              >
                {savingBatch ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Lançar {selectedCount}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <img src={preview} alt="Recibo" className="w-full rounded-lg max-h-48 object-contain" />
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{scanMode === "invoice" ? "Lendo fatura com IA..." : "Processando imagem..."}</span>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição da compra" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select value={editInstallments} onValueChange={setEditInstallments}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState} className="flex-1">Nova Foto</Button>
                <Button onClick={handleConfirm} disabled={createPurchase.isPending} className="flex-1">
                  {createPurchase.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirmar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CreditCardVoiceRecorder({ cardId, onPurchaseCreated, createPurchase }: { 
  cardId: string; 
  onPurchaseCreated: () => void;
  createPurchase: any;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [result, setResult] = useState<{ text: string; transaction: { amount: number | null; description: string | null; category: string | null } } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("Outros");
  const [editInstallments, setEditInstallments] = useState("1");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (error) {
      toast({ title: "Erro ao acessar microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const response = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioData: base64, mimeType: audioBlob.type }),
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setResult(data);
          setEditAmount(data.transaction?.amount?.toString() || "");
          setEditDescription(data.transaction?.description || "");
          setEditCategory(data.transaction?.category || "Outros");
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      toast({ title: "Erro ao processar áudio", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(editAmount);
    if (!amount || !cardId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const installments = parseInt(editInstallments) || 1;
    const installmentValue = amount / installments;
    createPurchase.mutate({
      creditCardId: cardId,
      description: editDescription || "Compra via voz",
      totalAmount: String(amount),
      installments,
      installmentValue: String(installmentValue),
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      category: editCategory
    }, {
      onSuccess: () => {
        toast({ title: "Compra lançada!", description: `${editDescription} - ${formatCurrency(amount)}` });
        onPurchaseCreated();
      },
      onError: (error: any) => {
        toast({ title: "Erro ao lançar compra", description: String(error), variant: "destructive" });
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {!result ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'}`}>
            <Mic className={`w-12 h-12 ${isRecording ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
          {isRecording && <span className="text-2xl font-mono">{formatTime(recordingTime)}</span>}
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando...</span>
            </div>
          ) : (
            <Button onClick={isRecording ? stopRecording : startRecording} size="lg" variant={isRecording ? "destructive" : "default"}>
              {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
            </Button>
          )}
          <p className="text-sm text-gray-500 text-center">
            Diga algo como: "Comprei um café de 15 reais" ou "37 reais no mercado"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <strong>Transcrição:</strong> {result.text}
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição da compra" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Compras", "Serviços", "Outros"].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={editInstallments} onValueChange={setEditInstallments}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setResult(null)} className="flex-1">Nova Gravação</Button>
              <Button onClick={handleConfirm} disabled={createPurchase.isPending} className="flex-1">
                {createPurchase.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreditCards() {
  const [_, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const { data: apiCreditCards = [], isLoading: cardsLoading, isSuccess: cardsSuccess } = useCreditCards();
  const { data: apiCreditPurchases = [], isSuccess: purchasesSuccess } = useCreditPurchases();
  const { data: apiCreditPayments = [], isSuccess: paymentsSuccess } = useCreditPayments();
  const { data: apiAccounts = [], isSuccess: accountsSuccess } = useAccounts();
  const { data: apiSubscriptions = [], isSuccess: subscriptionsSuccess } = useSubscriptions();
  
  const createCreditCardMutation = useCreateCreditCard();
  const updateCreditCardMutation = useUpdateCreditCard();
  const deleteCreditCardMutation = useDeleteCreditCard();
  const createCreditPurchaseMutation = useCreateCreditPurchase();
  const updateCreditPurchaseMutation = useUpdateCreditPurchase();
  const deleteCreditPurchaseMutation = useDeleteCreditPurchase();
  const createCreditPaymentMutation = useCreateCreditPayment();
  
  const storeData = useFinancialStore();
  const addCreditPayment = storeData.addCreditPayment;
  const creditCategories = storeData.creditCategories;
  const addCreditCategory = storeData.addCreditCategory;
  const removeCreditCategory = storeData.removeCreditCategory;
  const addCreditCard = storeData.addCreditCard;
  const updateCreditCard = storeData.updateCreditCard;
  
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);
  
  const creditCards: CreditCard[] = useMemo(() => {
    if (cardsSuccess) {
      return apiCreditCards.map(c => ({
        id: c.id,
        name: c.name,
        brand: c.brand as "mastercard" | "visa" | "amex" | "elo" | "hipercard" | "other",
        creditLimit: parseFloat(c.creditLimit),
        closingDay: c.closingDay,
        dueDay: c.dueDay,
        color: c.color,
        linkedAccountId: c.linkedAccountId ?? undefined,
        hasAnnualFee: c.hasAnnualFee ?? false,
        annualFeeValue: c.annualFeeValue ? parseFloat(c.annualFeeValue) : undefined,
        status: (c.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
      }));
    }
    return storeData.creditCards;
  }, [apiCreditCards, storeData.creditCards, cardsSuccess]);
  
  const creditPurchases: CreditPurchase[] = useMemo(() => {
    if (purchasesSuccess) {
      return apiCreditPurchases.map(p => ({
        id: p.id,
        creditCardId: p.creditCardId,
        description: p.description,
        totalAmount: parseFloat(p.totalAmount),
        purchaseDate: p.purchaseDate,
        installments: p.installments,
        installmentValue: parseFloat(p.installmentValue),
        category: (p.category ?? 'outros') as any,
        status: (p.status === 'active' || p.status === 'partial_refund' || p.status === 'refunded') 
          ? p.status as "active" | "partial_refund" | "refunded"
          : 'active',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }
    return storeData.creditPurchases;
  }, [apiCreditPurchases, storeData.creditPurchases, purchasesSuccess]);
  
  const accounts = useMemo(() => {
    if (accountsSuccess) {
      return apiAccounts.map(a => ({
        ...a,
        balance: parseFloat(a.balance),
        initialBalance: parseFloat(a.initialBalance),
      }));
    }
    return storeData.accounts;
  }, [apiAccounts, storeData.accounts, accountsSuccess]);

  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || "");
  const [activeTab, setActiveTab] = useState("current");
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [newCardData, setNewCardData] = useState({
    name: "",
    brand: "mastercard",
    creditLimit: "",
    closingDay: "",
    dueDay: "",
    color: "bg-black",
    hasAnnualFee: false,
    annualFeeValue: ""
  });
  
  const [editCardData, setEditCardData] = useState({
    name: "",
    brand: "mastercard",
    creditLimit: "",
    closingDay: "",
    dueDay: "",
    color: "bg-black",
    hasAnnualFee: false,
    annualFeeValue: ""
  });

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  const openEditCard = () => {
    if (!selectedCard) return;
    setEditCardData({
        name: selectedCard.name,
        brand: selectedCard.brand,
        creditLimit: formatCurrencyInput(String(selectedCard.creditLimit * 100)),
        closingDay: String(selectedCard.closingDay),
        dueDay: String(selectedCard.dueDay),
        color: selectedCard.color,
        hasAnnualFee: selectedCard.hasAnnualFee || false,
        annualFeeValue: selectedCard.annualFeeValue ? formatCurrencyInput(String(selectedCard.annualFeeValue * 100)) : ""
    });
    setIsEditCardOpen(true);
  };

  const handleEditCard = () => {
    if (!selectedCardId || !editCardData.name || !editCardData.creditLimit || !editCardData.closingDay || !editCardData.dueDay) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    const numericLimit = Number(editCardData.creditLimit.replace(/\D/g, "")) / 100;
    const numericFee = editCardData.hasAnnualFee ? (Number(editCardData.annualFeeValue.replace(/\D/g, "")) / 100) : 0;

    updateCreditCard(selectedCardId, {
        name: editCardData.name,
        brand: editCardData.brand as any,
        creditLimit: numericLimit,
        closingDay: Number(editCardData.closingDay),
        dueDay: Number(editCardData.dueDay),
        color: editCardData.color,
        hasAnnualFee: editCardData.hasAnnualFee,
        annualFeeValue: numericFee
    });

    setIsEditCardOpen(false);
    toast({ title: "Cartão atualizado com sucesso!" });
  };

  const formatCurrencyInput = (val: string) => {
    // Remove all non-numeric characters
    const number = val.replace(/\D/g, "");
    
    if (!number) return "";
    
    // Convert to value (cents)
    const value = Number(number) / 100;
    
    // Format using BRL currency style
    return value.toLocaleString("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
    });
  };

  const handleAddCard = async () => {
    if (!newCardData.name || !newCardData.creditLimit || !newCardData.closingDay || !newCardData.dueDay) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    const numericLimit = Number(newCardData.creditLimit.replace(/\D/g, "")) / 100;
    const numericFee = newCardData.hasAnnualFee ? (Number(newCardData.annualFeeValue.replace(/\D/g, "")) / 100) : 0;

    try {
      const cardData: any = {
        name: newCardData.name,
        brand: newCardData.brand,
        creditLimit: String(numericLimit),
        closingDay: Number(newCardData.closingDay),
        dueDay: Number(newCardData.dueDay),
        color: newCardData.color,
        hasAnnualFee: newCardData.hasAnnualFee,
      };
      if (numericFee > 0) {
        cardData.annualFeeValue = String(numericFee);
      }
      if (accounts[0]?.id) {
        cardData.linkedAccountId = accounts[0].id;
      }
      console.log('Creating credit card with data:', cardData);
      await createCreditCardMutation.mutateAsync(cardData);

      setNewCardData({
        name: "",
        brand: "mastercard",
        creditLimit: "",
        closingDay: "",
        dueDay: "",
        color: "bg-black",
        hasAnnualFee: false,
        annualFeeValue: ""
      });
      setIsAddCardOpen(false);
      toast({ title: "Cartão adicionado com sucesso!" });
    } catch (error: any) {
      console.error('Error creating credit card:', error);
      toast({ title: "Erro ao salvar cartão", description: error?.message || String(error), variant: "destructive" });
    }
  };

  // --- Helper Functions ---

  const getInvoiceMonthDate = (purchaseDate: Date, closingDay: number) => {
    // Regra do ciclo de fatura:
    // A fatura é nomeada pela COMPETÊNCIA (mês principal das compras).
    // Ex: fechamento dia 03, vencimento dia 07
    // - Compras de 04/01 até 03/02 -> fatura de JANEIRO (fecha 03/02, vence 07/02)
    // - Compras de 04/02 até 03/03 -> fatura de FEVEREIRO (fecha 03/03, vence 07/03)
    // 
    // Compra feita DEPOIS do fechamento vai para a fatura do MÊS ATUAL.
    // Compra feita ATÉ o fechamento vai para a fatura do MÊS ANTERIOR.

    const d = new Date(purchaseDate);

    // Se a compra foi feita DEPOIS do dia de fechamento, pertence à fatura do mês atual.
    // Ex: compra dia 04/02 com fechamento dia 03 -> fatura de fevereiro (fecha 03/03)
    if (d.getDate() > closingDay) {
      return d;
    }

    // Se foi ATÉ o fechamento, pertence à fatura do MÊS ANTERIOR.
    // Ex: compra dia 02/02 com fechamento dia 03 -> fatura de janeiro (fecha 03/02)
    return addMonths(d, -1);
  };

  const getInvoiceStatus = (card: CreditCard, month: Date) => {
    const today = new Date();
    const invoiceDate = new Date(month.getFullYear(), month.getMonth(), card.dueDay);
    
    if (isAfter(today, invoiceDate)) return 'closed'; // Actually overdue or paid
    // Ideally we check payments. For now simplified.
    return 'open';
  };

  const creditPayments = useMemo(() => {
    if (paymentsSuccess) {
      return apiCreditPayments.map(p => ({
        ...p,
        amount: parseFloat(p.amount),
      }));
    }
    return storeData.creditPayments;
  }, [apiCreditPayments, storeData.creditPayments, paymentsSuccess]);

  const isInvoicePastOrPaid = (card: CreditCard, targetMonth: number, targetYear: number) => {
    const hasPayment = (creditPayments || [])
      .filter(p => p.creditCardId === card.id)
      .some(p => Number(p.month) === targetMonth && Number(p.year) === targetYear);
    if (hasPayment) return true;

    const invoiceDueBase = addMonths(new Date(targetYear, targetMonth, 1), 1);
    const invoiceDueDate = new Date(invoiceDueBase.getFullYear(), invoiceDueBase.getMonth(), card.dueDay);
    return isAfter(startOfDay(new Date()), startOfDay(invoiceDueDate));
  };

  // Calculate invoice items for a specific month/year
  const getInvoiceItems = (cardId: string, month: Date) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return [];

    const targetMonth = month.getMonth();
    const targetYear = month.getFullYear();

    let items: { purchase: CreditPurchase, installment: number, value: number, date: string }[] = [];

    creditPurchases.filter(p => p.creditCardId === cardId && p.status === 'active').forEach(purchase => {
        const pDate = parseDateSafe(purchase.purchaseDate);
        // First installment month
        let currentInstallmentMonth = getInvoiceMonthDate(pDate, card.closingDay);
        
        for (let i = 1; i <= purchase.installments; i++) {
            if (currentInstallmentMonth.getMonth() === targetMonth && currentInstallmentMonth.getFullYear() === targetYear) {
                items.push({
                    purchase,
                    installment: i,
                    value: purchase.installmentValue,
                    date: purchase.purchaseDate
                });
            }
            currentInstallmentMonth = addMonths(currentInstallmentMonth, 1);
        }
    });

    // Add Annual Fee if applicable (monthly charge, invoice-only)
    // Only add to invoices that are NOT past due or already paid
    if (card.hasAnnualFee && card.annualFeeValue && card.annualFeeValue > 0 && !isInvoicePastOrPaid(card, targetMonth, targetYear)) {
        const feeValue = card.annualFeeValue;

        // Invoice-only synthetic item: it must show on the invoice for THIS competence month,
        // but it must NOT behave like a 12x installment purchase.
        const feePurchase: CreditPurchase = {
            id: `fee-${card.id}-${targetMonth}-${targetYear}`,
            creditCardId: card.id,
            description: 'Anuidade',
            totalAmount: feeValue,
            installments: 1,
            installmentValue: feeValue,
            category: 'Outros',
            purchaseDate: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        items.push({
            purchase: feePurchase,
            installment: 1,
            value: feeValue,
            date: feePurchase.purchaseDate
        });
    }

    return items;
  };

  const [invoiceMonthOffset, setInvoiceMonthOffset] = useState(0);
  const [invoiceTargetDate, setInvoiceTargetDate] = useState<Date | null>(null);

  const defaultBaseInvoiceDate = useMemo(() => {
    if (!selectedCard) return new Date();
    const now = new Date();
    const baseCompetence = now.getDate() > selectedCard.closingDay ? now : addMonths(now, -1);
    return new Date(baseCompetence.getFullYear(), baseCompetence.getMonth(), 1);
  }, [selectedCard]);

  const baseInvoiceDate = useMemo(() => {
    if (invoiceTargetDate) return invoiceTargetDate;
    return addMonths(defaultBaseInvoiceDate, invoiceMonthOffset);
  }, [defaultBaseInvoiceDate, invoiceMonthOffset, invoiceTargetDate]);

  const invoicePaymentsTotalForDate = useMemo(() => {
    if (!selectedCard) return 0;

    const invoiceDueBase = addMonths(baseInvoiceDate, 1);
    const invoiceDueDate = new Date(invoiceDueBase.getFullYear(), invoiceDueBase.getMonth(), selectedCard.dueDay);

    return (creditPayments || [])
      .filter((p) => p.creditCardId === selectedCard.id)
      .filter((p) => {
        const payDate = parseISO(String(p.paymentDate || '').length === 10 ? `${p.paymentDate}T12:00:00` : p.paymentDate);
        return payDate <= endOfDay(invoiceDueDate);
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [creditPayments, selectedCard, baseInvoiceDate]);

  const invoiceItemsForBaseDate = useMemo(() => {
    if (!selectedCardId) return [];
    return getInvoiceItems(selectedCardId, baseInvoiceDate);
  }, [selectedCardId, baseInvoiceDate]);

  const invoiceTotalForBaseDate = invoiceItemsForBaseDate.reduce((acc, item) => acc + item.value, 0);
  const openInvoiceTotalForBaseDate = Math.max(0, invoiceTotalForBaseDate - invoicePaymentsTotalForDate);

  const currentInvoiceDate = useMemo(() => {
    if (!selectedCard) return baseInvoiceDate;
    if (invoiceMonthOffset !== 0 || invoiceTargetDate) return baseInvoiceDate;
    if (openInvoiceTotalForBaseDate > 0) return baseInvoiceDate;
    return addMonths(baseInvoiceDate, 1);
  }, [selectedCard, baseInvoiceDate, openInvoiceTotalForBaseDate, invoiceMonthOffset, invoiceTargetDate]);

  const invoiceItems = useMemo(() => {
    if (!selectedCardId) return [];
    return getInvoiceItems(selectedCardId, currentInvoiceDate);
  }, [selectedCardId, currentInvoiceDate]);

  const invoiceTotal = invoiceItems.reduce((acc, item) => acc + item.value, 0);

  const invoicePaymentsTotal = useMemo(() => {
    if (!selectedCard) return 0;

    const invoiceDueBase = addMonths(currentInvoiceDate, 1);
    const invoiceDueDate = new Date(invoiceDueBase.getFullYear(), invoiceDueBase.getMonth(), selectedCard.dueDay);

    return (creditPayments || [])
      .filter((p) => p.creditCardId === selectedCard.id)
      .filter((p) => {
        const payDate = parseISO(String(p.paymentDate || '').length === 10 ? `${p.paymentDate}T12:00:00` : p.paymentDate);
        return payDate <= endOfDay(invoiceDueDate);
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [creditPayments, selectedCard, currentInvoiceDate]);

  const openInvoiceTotal = Math.max(0, invoiceTotal - invoicePaymentsTotal);

  const futureInvoices = useMemo(() => {
      if (!selectedCard) return [];
      const invoices: { date: Date; total: number; items: any[] }[] = [];

      // FUTURAS deve mostrar os próximos meses de COMPETÊNCIA.
      // Ex: se a fatura atual é Janeiro, futuras começa em Fevereiro.
      let date = new Date(currentInvoiceDate.getFullYear(), currentInvoiceDate.getMonth() + 1, 1);

      for (let i = 0; i < 12; i++) {
          const items = getInvoiceItems(selectedCard.id, date);
          const total = items.reduce((acc, curr) => acc + curr.value, 0);
          if (total > 0) {
              invoices.push({ date: new Date(date), total, items });
          }
          date = addMonths(date, 1);
      }

      return invoices;
  }, [selectedCard, currentInvoiceDate]);


  const [projectionRange, setProjectionRange] = useState<'currentYear' | 'next12Months'>('currentYear');

  // --- Total Projection Calculation (All Cards) ---
  const totalProjection = useMemo(() => {
      const projection = [];

      const now = new Date();
      let monthCursor = new Date(now.getFullYear(), 0, 1);
      let monthsToShow = 12;

      if (projectionRange === 'next12Months') {
        // Próximos 12 meses (competência da FATURA, não do vencimento).
        // Começa no mês anterior ao atual (exibe o mês corrente do ciclo + 11 seguintes)
        // Assim, se hoje é fevereiro, o gráfico inclui janeiro (importante para faturas ainda em aberto).
        monthCursor = addMonths(new Date(), -1);
        monthCursor.setDate(1);
        monthsToShow = 12;
      }

      for (let i = 0; i < monthsToShow; i++) {
          let monthTotal = 0;
          const byCard: { cardId: string; name: string; total: number }[] = [];

          creditCards.forEach(card => {
              const items = getInvoiceItems(card.id, monthCursor);
              const invoiceTotalForMonth = items.reduce((a, b) => a + b.value, 0);

              // Subtrai pagamentos feitos ATÉ o vencimento da fatura desse mês.
              const dueBase = addMonths(monthCursor, 1);
              const dueDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), card.dueDay);

              const paidForMonth = (creditPayments || [])
                .filter(p => p.creditCardId === card.id)
                // Paga pela DATA, mas apenas da fatura desse mês de competência.
                // Senão, pagamentos de outras competências “somem” do gráfico.
                .filter(p => {
                  const paymentCompetence = new Date(Number(p.year), Number(p.month), 1);
                  return isSameMonth(paymentCompetence, monthCursor);
                })
                .filter(p => {
                  const payDate = parseISO(String(p.paymentDate || '').length === 10 ? `${p.paymentDate}T12:00:00` : p.paymentDate);
                  return payDate <= endOfDay(dueDate);
                })
                .reduce((sum, p) => sum + (p.amount || 0), 0);

              const openForMonth = Math.max(0, invoiceTotalForMonth - paidForMonth);

              monthTotal += openForMonth;

              if (openForMonth > 0) {
                  byCard.push({ cardId: card.id, name: card.name, total: openForMonth });
              }
          });

          projection.push({
              name: format(monthCursor, 'MMM', { locale: ptBR }),
              fullDate: format(monthCursor, 'MMMM yyyy', { locale: ptBR }),
              total: monthTotal,
              byCard: byCard.sort((a, b) => b.total - a.total),
              month: monthCursor.getMonth(),
              year: monthCursor.getFullYear()
          });

          monthCursor = addMonths(monthCursor, 1);
      }

      return projection;
  }, [creditCards, creditPurchases, creditPayments, projectionRange]);


  // Calculate Limits
  const totalLimit = selectedCard?.creditLimit || 0;

  // User rule:
  // available = limit - (current invoice total + future installments)
  // where subscriptions/annual fee impact ONLY their own invoice month (already included in invoiceTotal/future invoices)
  const futureInstallmentsTotal = useMemo(() => {
      if (!selectedCardId || !selectedCard) return 0;

      const currentMonth = currentInvoiceDate.getMonth();
      const currentYear = currentInvoiceDate.getFullYear();

      return creditPurchases
        .filter(p => p.creditCardId === selectedCardId && p.status === 'active')
        // exclude synthetic fee objects
        .filter(p => !String(p.id).startsWith('fee-'))
        // Only real installments can create "future installments".
        .filter(p => (p.installments || 1) > 1)
        .reduce((sum, purchase) => {
          const pDate = parseDateSafe(purchase.purchaseDate);
          let monthCursor = getInvoiceMonthDate(pDate, selectedCard.closingDay);

          let futureSum = 0;
          for (let i = 1; i <= purchase.installments; i++) {
            const isCurrent = monthCursor.getMonth() === currentMonth && monthCursor.getFullYear() === currentYear;
            const isFuture = isAfter(startOfMonth(monthCursor), startOfMonth(currentInvoiceDate));

            if (!isCurrent && isFuture) {
              futureSum += purchase.installmentValue;
            }

            monthCursor = addMonths(monthCursor, 1);
          }

          return sum + futureSum;
        }, 0);
  }, [selectedCardId, selectedCard, creditPurchases, currentInvoiceDate]);

  const usedLimit = openInvoiceTotal + futureInstallmentsTotal;
  const availableLimit = totalLimit - usedLimit;
  const limitPercentage = totalLimit > 0 ? (usedLimit / totalLimit) * 100 : 0;


  // --- New Purchase Form ---
  const [newPurchase, setNewPurchase] = useState({
      description: "",
      amountMode: "total" as 'total' | 'installment',
      amount: "",
      installmentAmount: "",
      installments: "1",
      category: "Outros",
      date: new Date().toISOString().split('T')[0]
  });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [isPhotoScannerOpen, setIsPhotoScannerOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  const resetPurchaseForm = () => {
      setNewPurchase({
          description: "",
          amountMode: "total",
          amount: "",
          installmentAmount: "",
          installments: "1",
          category: "Outros",
          date: new Date().toISOString().split('T')[0]
      });
      setEditingPurchaseId(null);
  };

  const openEditPurchase = (purchase: CreditPurchase) => {
      setEditingPurchaseId(purchase.id);
      setNewPurchase({
          description: purchase.description,
          amountMode: "total",
          amount: formatCurrencyInput(String(purchase.totalAmount * 100)),
          installmentAmount: formatCurrencyInput(String((purchase.installmentValue || 0) * 100)),
          installments: String(purchase.installments),
          category: purchase.category as any,
          date: purchase.purchaseDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
      });
      setIsPurchaseOpen(true);
  };

  const handleSavePurchase = () => {
      const inst = Number(newPurchase.installments || '1') || 1;
      const totalFromTotal = Number((newPurchase.amount || '').replace(/\D/g, "")) / 100;
      const totalFromInstallment = (Number((newPurchase.installmentAmount || '').replace(/\D/g, "")) / 100) * inst;
      const total = newPurchase.amountMode === 'installment' ? totalFromInstallment : totalFromTotal;

      if (!newPurchase.description || !total || !selectedCardId) {
          toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
          return;
      }

      if (editingPurchaseId) {
          updateCreditPurchaseMutation.mutate({
              id: editingPurchaseId,
              data: {
                  description: newPurchase.description,
                  totalAmount: String(total),
                  installments: inst,
                  installmentValue: String(total / inst),
                  category: newPurchase.category || 'Outros',
                  purchaseDate: newPurchase.date,
              }
          }, {
              onSuccess: () => {
                  toast({ title: "Lançamento atualizado" });
                  resetPurchaseForm();
                  setIsPurchaseOpen(false);
              },
              onError: () => {
                  toast({ title: "Erro ao atualizar compra", variant: "destructive" });
              }
          });
      } else {
          createCreditPurchaseMutation.mutate({
              creditCardId: selectedCardId,
              description: newPurchase.description,
              totalAmount: String(total),
              installments: inst,
              installmentValue: String(total / inst),
              category: newPurchase.category || 'Outros',
              purchaseDate: newPurchase.date,
          }, {
              onSuccess: () => {
                  toast({ title: "Compra adicionada com sucesso!" });
                  resetPurchaseForm();
                  setIsPurchaseOpen(false);
              },
              onError: () => {
                  toast({ title: "Erro ao adicionar compra", variant: "destructive" });
              }
          });
      }
  };

  const handleDeleteInstallmentOnly = (purchaseId: string) => {
      const p = creditPurchases.find(x => x.id === purchaseId);
      if (!p) return;

      if (p.installments <= 1) {
          deleteCreditPurchaseMutation.mutate(purchaseId, {
              onSuccess: () => toast({ title: "Lançamento removido" }),
              onError: () => toast({ title: "Erro ao remover", variant: "destructive" })
          });
          return;
      }

      const newInstallments = p.installments - 1;
      updateCreditPurchaseMutation.mutate({
          id: purchaseId,
          data: {
              installments: newInstallments,
              totalAmount: String(p.installmentValue * newInstallments),
          }
      }, {
          onSuccess: () => toast({ title: "Parcela removida", description: "Removeu 1 parcela deste lançamento." }),
          onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" })
      });
  };

  const handleDeleteEntirePurchase = (purchaseId: string) => {
      deleteCreditPurchaseMutation.mutate(purchaseId, {
          onSuccess: () => toast({ title: "Lançamento excluído" }),
          onError: () => toast({ title: "Erro ao excluir", variant: "destructive" })
      });
  };

  // --- Payment Form ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
      amount: "",
      accountId: accounts.find(a => a.isPersonal)?.id || "",
      date: new Date().toISOString().split('T')[0]
  });

  const handlePayInvoice = () => {
      if (!paymentData.amount || !paymentData.accountId) {
          toast({ title: "Preencha os dados do pagamento", variant: "destructive" });
          return;
      }
      
      const numericAmount = Number(paymentData.amount.replace(/\D/g, "")) / 100;

      const payDate = parseISO(String(paymentData.date || '').length === 10 ? `${paymentData.date}T12:00:00` : paymentData.date);
      const paymentCompetence = getInvoiceMonthDate(payDate, selectedCard?.closingDay || 1);

      createCreditPaymentMutation.mutate({
          creditCardId: selectedCardId,
          amount: String(numericAmount),
          accountId: paymentData.accountId,
          paymentDate: paymentData.date,
          month: paymentCompetence.getMonth(),
          year: paymentCompetence.getFullYear(),
          type: 'partial'
      }, {
          onSuccess: () => {
              toast({ title: "Pagamento registrado com sucesso!" });
              setIsPaymentOpen(false);
          },
          onError: () => {
              toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
          }
      });
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-zinc-950 pb-20">
        {/* Header with Card Selector */}
        <div className="p-6 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cartões</h1>
                <Dialog open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
                    <DialogTrigger asChild>
                         <Button size="sm" variant="ghost" className="h-8 gap-2 text-primary font-bold bg-primary/10 hover:bg-primary/20">
                            <BarChart2 className="w-4 h-4" /> Projeção Geral
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Comprometimento Mensal</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <p className="text-sm text-gray-500">Total de faturas (todos os cartões).</p>

                                <div className="inline-flex rounded-lg bg-gray-100 dark:bg-zinc-900 p-1 border border-gray-200/70 dark:border-zinc-800" data-testid="segmented-projection-range">
                                    <button
                                        type="button"
                                        onClick={() => setProjectionRange('currentYear')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${projectionRange === 'currentYear' ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white'}`}
                                        data-testid="button-projection-range-current-year"
                                    >
                                        Ano atual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProjectionRange('next12Months')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${projectionRange === 'next12Months' ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white'}`}
                                        data-testid="button-projection-range-next-12"
                                    >
                                        Próx. 12 meses
                                    </button>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={totalProjection}>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-zinc-800">
                                                        <p className="font-bold text-sm">{payload[0].payload.fullDate}</p>
                                                        <p className="text-primary font-bold">{formatCurrency(Number(payload[0].value))}</p>
                                                    </div>
                                                );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                {totalProjection.filter(p => p.total > 0).map((p, idx) => (
                                    <details
                                        key={idx}
                                        className="group rounded-lg bg-gray-50 dark:bg-zinc-900"
                                        data-testid={`accordion-projection-month-${idx}`}
                                    >
                                        <summary
                                            className="flex justify-between items-center text-sm p-2 cursor-pointer list-none"
                                            data-testid={`button-projection-month-${idx}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium" data-testid={`text-projection-month-${idx}`}>{p.fullDate}</span>
                                                <span
                                                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 text-gray-500 dark:text-zinc-300 border border-gray-200/80 dark:border-zinc-800"
                                                    data-testid={`badge-projection-cards-${idx}`}
                                                >
                                                    {p.byCard?.length || 0} cartão(ões)
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white" data-testid={`text-projection-total-${idx}`}>{formatCurrency(p.total)}</span>
                                                <span
                                                    className="text-gray-400 transition-transform group-open:rotate-180"
                                                    aria-hidden="true"
                                                    data-testid={`icon-projection-chevron-${idx}`}
                                                >
                                                    ▾
                                                </span>
                                            </div>
                                        </summary>

                                        {p.byCard?.length > 0 && (
                                            <div className="px-2 pb-2 pt-1 border-t border-gray-200/70 dark:border-zinc-800">
                                                <div className="space-y-1">
                                                    {p.byCard.map((c: any) => {
                                                        const cardColor = creditCards.find(cc => cc.id === c.cardId)?.color;
                                                        return (
                                                            <div
                                                                key={c.cardId}
                                                                className="flex items-center justify-between rounded-md px-2 py-1.5 bg-white/70 dark:bg-black/20"
                                                                data-testid={`row-projection-card-${c.cardId}-${idx}`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span
                                                                        className={`h-2.5 w-2.5 rounded-full ${cardColor || 'bg-gray-300'} ring-2 ring-white/70 dark:ring-black/30`}
                                                                        aria-hidden="true"
                                                                        data-testid={`dot-projection-card-${c.cardId}-${idx}`}
                                                                    />
                                                                    <span
                                                                        className="text-xs text-gray-600 dark:text-zinc-300 truncate"
                                                                        data-testid={`text-projection-card-name-${c.cardId}-${idx}`}
                                                                    >
                                                                        {c.name}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-900 dark:text-white" data-testid={`text-projection-card-total-${c.cardId}-${idx}`}>{formatCurrency(c.total)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </details>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
               
            </div>

            {/* Card Carousel / Selector */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {creditCards.map(card => (
                    <div 
                        key={card.id}
                        onClick={() => { setSelectedCardId(card.id); setInvoiceMonthOffset(0); setInvoiceTargetDate(null); }}
                        className={`min-w-[280px] p-4 rounded-xl transition-all cursor-pointer border-2 ${
                            selectedCardId === card.id 
                            ? 'border-gray-900 dark:border-white shadow-lg scale-[1.02]' 
                            : 'border-transparent bg-gray-100 dark:bg-zinc-900 opacity-70'
                        } ${card.color} text-white relative overflow-hidden group`}
                    >
                        {selectedCardId === card.id && (
                            <div className="absolute top-2 right-2 flex gap-1 z-10">
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditCard();
                                    }}
                                    className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-white" />
                                </div>
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Tem certeza que deseja excluir este cartão? Todas as compras e pagamentos associados serão removidos.')) {
                                            deleteCreditCardMutation.mutate(card.id);
                                        }
                                    }}
                                    className="p-1.5 bg-red-500/60 hover:bg-red-500/80 rounded-full transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-8">
                            <span className="font-medium">{card.name}</span>
                            {card.brand === 'mastercard' && <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-red-500/80"></div><div className="w-6 h-6 rounded-full bg-yellow-500/80"></div></div>}
                            {card.brand === 'visa' && <span className="font-bold italic text-lg">VISA</span>}
                            {card.brand === 'elo' && <span className="font-bold text-lg">elo</span>}
                            {card.brand === 'amex' && <span className="font-bold text-lg tracking-tighter">AMEX</span>}
                            {card.brand === 'hipercard' && <span className="font-bold italic text-lg">Hiper</span>}
                            {card.brand === 'other' && <CreditCardIcon className="w-6 h-6" />}
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs opacity-80 mb-1">Limite Disponível</p>
                                <p className="font-bold text-xl">{formatCurrency(card.creditLimit - (selectedCardId === card.id ? (openInvoiceTotal + futureInstallmentsTotal) : 0))}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Fatura Atual</p>
                                <p className="font-bold">Vence dia {card.dueDay}</p>
                            </div>
                        </div>
                    </div>
                ))}
                 
                 <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="min-w-[50px] h-[140px] rounded-xl border-dashed border-2 flex flex-col gap-2 items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-900">
                            <Plus className="w-8 h-8 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">Novo</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Cartão</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Cartão</Label>
                                <Input 
                                    placeholder="Ex: Nubank Platinum" 
                                    value={newCardData.name}
                                    onChange={(e) => setNewCardData({...newCardData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bandeira</Label>
                                <Select 
                                    value={newCardData.brand} 
                                    onValueChange={(v) => setNewCardData({...newCardData, brand: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mastercard">Mastercard</SelectItem>
                                        <SelectItem value="visa">Visa</SelectItem>
                                        <SelectItem value="elo">Elo</SelectItem>
                                        <SelectItem value="amex">American Express</SelectItem>
                                        <SelectItem value="hipercard">Hipercard</SelectItem>
                                        <SelectItem value="other">Outra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Limite de Crédito</Label>
                                <Input 
                                    value={newCardData.creditLimit}
                                    placeholder="R$ 0,00"
                                    inputMode="numeric"
                                    onChange={(e) => setNewCardData({...newCardData, creditLimit: formatCurrencyInput(e.target.value)})}
                                    className="text-lg font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dia Fechamento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={newCardData.closingDay}
                                        onChange={(e) => setNewCardData({...newCardData, closingDay: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dia Vencimento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={newCardData.dueDay}
                                        onChange={(e) => setNewCardData({...newCardData, dueDay: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cor do Cartão</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {['bg-black', 'bg-purple-600', 'bg-blue-600', 'bg-red-600', 'bg-green-600', 'bg-orange-500', 'bg-yellow-500', 'bg-pink-600', 'bg-indigo-600', 'bg-gray-600'].map(color => (
                                        <div 
                                            key={color}
                                            className={`w-8 h-8 rounded-full cursor-pointer ${color} ${newCardData.color === color ? 'ring-2 ring-offset-2 ring-black dark:ring-white' : ''}`}
                                            onClick={() => setNewCardData({...newCardData, color})}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <Label className="cursor-pointer" htmlFor="annual-fee">Possui Anuidade?</Label>
                                    <input 
                                        id="annual-fee"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={newCardData.hasAnnualFee}
                                        onChange={(e) => setNewCardData({...newCardData, hasAnnualFee: e.target.checked})}
                                    />
                                </div>
                                {newCardData.hasAnnualFee && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Valor da Anuidade (Mensal)</Label>
                                        <Input 
                                            value={newCardData.annualFeeValue}
                                            placeholder="R$ 0,00"
                                            inputMode="numeric"
                                            onChange={(e) => setNewCardData({...newCardData, annualFeeValue: formatCurrencyInput(e.target.value)})}
                                        />
                                        <p className="text-[10px] text-gray-500">
                                            Este valor será cobrado automaticamente em todas as faturas.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button className="w-full mt-2" onClick={handleAddCard}>Criar Cartão</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditCardOpen} onOpenChange={setIsEditCardOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Cartão</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Cartão</Label>
                                <Input 
                                    placeholder="Ex: Nubank Platinum" 
                                    value={editCardData.name}
                                    onChange={(e) => setEditCardData({...editCardData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bandeira</Label>
                                <Select 
                                    value={editCardData.brand} 
                                    onValueChange={(v) => setEditCardData({...editCardData, brand: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mastercard">Mastercard</SelectItem>
                                        <SelectItem value="visa">Visa</SelectItem>
                                        <SelectItem value="elo">Elo</SelectItem>
                                        <SelectItem value="amex">American Express</SelectItem>
                                        <SelectItem value="hipercard">Hipercard</SelectItem>
                                        <SelectItem value="other">Outra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Cor do Cartão</Label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {['bg-black', 'bg-purple-600', 'bg-blue-600', 'bg-red-600', 'bg-green-600', 'bg-orange-500', 'bg-yellow-500', 'bg-pink-600', 'bg-indigo-600', 'bg-gray-600'].map(color => (
                                        <div 
                                            key={color}
                                            className={`w-8 h-8 rounded-full cursor-pointer ${color} ${editCardData.color === color ? 'ring-2 ring-offset-2 ring-black dark:ring-white' : ''}`}
                                            onClick={() => setEditCardData({...editCardData, color})}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Limite de Crédito</Label>
                                <Input 
                                    value={editCardData.creditLimit}
                                    placeholder="R$ 0,00"
                                    inputMode="numeric"
                                    onChange={(e) => setEditCardData({...editCardData, creditLimit: formatCurrencyInput(e.target.value)})}
                                    className="text-lg font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dia Fechamento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={editCardData.closingDay}
                                        onChange={(e) => setEditCardData({...editCardData, closingDay: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dia Vencimento</Label>
                                    <Input 
                                        type="number"
                                        placeholder="Dia" 
                                        min="1" max="31"
                                        value={editCardData.dueDay}
                                        onChange={(e) => setEditCardData({...editCardData, dueDay: e.target.value})}
                                    />
                                </div>
                            </div>
                             <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <Label className="cursor-pointer" htmlFor="edit-annual-fee">Possui Anuidade?</Label>
                                    <input 
                                        id="edit-annual-fee"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={editCardData.hasAnnualFee}
                                        onChange={(e) => setEditCardData({...editCardData, hasAnnualFee: e.target.checked})}
                                    />
                                </div>
                                {editCardData.hasAnnualFee && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Valor da Anuidade (Mensal)</Label>
                                        <Input 
                                            value={editCardData.annualFeeValue}
                                            placeholder="R$ 0,00"
                                            inputMode="numeric"
                                            onChange={(e) => setEditCardData({...editCardData, annualFeeValue: formatCurrencyInput(e.target.value)})}
                                        />
                                    </div>
                                )}
                            </div>
                            <Button className="w-full" onClick={handleEditCard}>Salvar Alterações</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        {selectedCard && (
            <div className="flex-1 p-6 space-y-6">
                
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1" onClick={() => setIsPhotoScannerOpen(true)}>
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Recibo</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1" onClick={() => setIsVoiceRecorderOpen(true)}>
                    <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                      <Mic className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Voz</span>
                  </Button>

                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all group p-1" onClick={() => toast({title: "Leitura de notificação em breve"})}>
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
                        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Notif.</span>
                  </Button>

                  <Button variant="outline" className="h-auto py-3 flex flex-col gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group p-1" onClick={() => setIsPurchaseOpen(true)}>
                      <div className="p-2.5 bg-primary text-white rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-primary">Manual</span>
                  </Button>
                </div>

                {/* Main Actions */}
                <div className="grid grid-cols-1 gap-3">
                    <Dialog open={isPurchaseOpen} onOpenChange={(open) => {
                        setIsPurchaseOpen(open);
                        if (!open) resetPurchaseForm();
                    }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingPurchaseId ? 'Editar Lançamento' : 'Lançar Compra'} - {selectedCard.name}</DialogTitle>
                                <DialogDescription>
                                    {editingPurchaseId ? 'As alterações serão aplicadas ao lançamento inteiro (todas as parcelas).' : 'Registre uma compra no cartão para compor a fatura.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>O que você comprou?</Label>
                                    <Input 
                                        placeholder="Ex: Supermercado, Uber..." 
                                        value={newPurchase.description}
                                        onChange={(e) => setNewPurchase({...newPurchase, description: e.target.value})}
                                        data-testid="input-credit-purchase-description"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Valor</Label>
                                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-900 rounded-full p-1">
                                                <button
                                                    type="button"
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${newPurchase.amountMode === 'total' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500'}`}
                                                    onClick={() => {
                                                        // When switching to Total, calculate total from installment amount
                                                        const inst = Number(newPurchase.installments || '1') || 1;
                                                        const instAmountCents = Number((newPurchase.installmentAmount || '').replace(/\D/g, ""));
                                                        const totalCents = instAmountCents * inst;
                                                        const newAmount = totalCents > 0 ? formatCurrencyInput(String(totalCents)) : newPurchase.amount;
                                                        setNewPurchase({ ...newPurchase, amountMode: 'total', amount: newAmount });
                                                    }}
                                                    data-testid="button-credit-amountmode-total"
                                                >
                                                    Total
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${newPurchase.amountMode === 'installment' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500'}`}
                                                    onClick={() => {
                                                        // When switching to Parcela, calculate installment from total
                                                        const inst = Number(newPurchase.installments || '1') || 1;
                                                        const totalCents = Number((newPurchase.amount || '').replace(/\D/g, ""));
                                                        const instCents = Math.round(totalCents / inst);
                                                        const newInstAmount = instCents > 0 ? formatCurrencyInput(String(instCents)) : newPurchase.installmentAmount;
                                                        setNewPurchase({ ...newPurchase, amountMode: 'installment', installmentAmount: newInstAmount });
                                                    }}
                                                    data-testid="button-credit-amountmode-installment"
                                                >
                                                    Parcela
                                                </button>
                                            </div>
                                        </div>

                                        {newPurchase.amountMode === 'total' ? (
                                            <Input 
                                                value={newPurchase.amount}
                                                placeholder="R$ 0,00"
                                                onChange={(e) => setNewPurchase({...newPurchase, amount: formatCurrencyInput(e.target.value)})}
                                                className="text-lg font-bold"
                                                data-testid="input-credit-purchase-amount"
                                            />
                                        ) : (
                                            <Input 
                                                value={newPurchase.installmentAmount}
                                                placeholder="R$ 0,00"
                                                onChange={(e) => setNewPurchase({...newPurchase, installmentAmount: formatCurrencyInput(e.target.value)})}
                                                className="text-lg font-bold"
                                                data-testid="input-credit-purchase-installment-amount"
                                            />
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-1" data-testid="text-credit-amount-hint">
                                            {newPurchase.amountMode === 'total' ? 'Digite o valor total da compra.' : 'Digite o valor de cada parcela. O total será calculado automaticamente.'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Parcelas</Label>
                                        <Select 
                                            value={newPurchase.installments} 
                                            onValueChange={(v) => setNewPurchase({...newPurchase, installments: v})}
                                        >
                                            <SelectTrigger data-testid="select-credit-purchase-installments">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">À vista (1x)</SelectItem>
                                                {Array.from({ length: 59 }, (_, idx) => idx + 2).map(i => (
                                                    <SelectItem key={i} value={String(i)}>{i}x</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="mt-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3" data-testid="card-credit-installment-preview">
                                            {(() => {
                                                const inst = Number(newPurchase.installments || '1') || 1;
                                                const total = (Number((newPurchase.amount || '').replace(/\D/g, '')) / 100) || 0;
                                                const per = inst > 0 ? total / inst : 0;
                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                                            <span>Total</span>
                                                            <span className="font-medium" data-testid="text-credit-total-preview">{(total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm mt-1">
                                                            <span className="font-semibold">{inst}x</span>
                                                            <span className="font-bold" data-testid="text-credit-per-installment-preview">{(per || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label>Categoria</Label>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs"
                                                        data-testid="button-manage-credit-categories"
                                                    >
                                                        Gerenciar
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md" data-testid="dialog-manage-credit-categories">
                                                    <DialogHeader>
                                                        <DialogTitle data-testid="text-manage-credit-categories-title">Categorias do Cartão</DialogTitle>
                                                        <DialogDescription data-testid="text-manage-credit-categories-description">
                                                            Adicione ou remova categorias usadas em compras no cartão.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <ManageInlineCategories
                                                      scope="credit"
                                                      categories={creditCategories}
                                                      onAdd={(name) => {
                                                        addCreditCategory(name);
                                                        toast({ title: "Categoria adicionada" });
                                                      }}
                                                      onRemove={(name) => {
                                                        removeCreditCategory(name);
                                                        toast({ title: "Categoria removida" });
                                                      }}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        <Select 
                                            value={newPurchase.category} 
                                            onValueChange={(v) => setNewPurchase({...newPurchase, category: v})}
                                        >
                                            <SelectTrigger data-testid="select-credit-category">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {creditCategories.map((cat) => (
                                                  <SelectItem key={cat} value={cat} data-testid={`option-credit-category-${cat}`}>
                                                    {cat}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data da Compra</Label>
                                        <Input 
                                            type="date"
                                            value={newPurchase.date}
                                            onChange={(e) => setNewPurchase({...newPurchase, date: e.target.value})}
                                            data-testid="input-credit-purchase-date"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full" onClick={handleSavePurchase} data-testid="button-save-credit-purchase">
                                    {editingPurchaseId ? 'Salvar Alterações' : 'Salvar Compra'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed border-2">
                                <Receipt className="w-6 h-6 text-gray-500" />
                                <span className="font-medium text-gray-600">Pagar Fatura</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Pagar Fatura - {selectedCard.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg text-center">
                                    <p className="text-sm text-gray-500">Fatura Atual (em aberto)</p>
                                    <p className="text-2xl font-bold" data-testid="text-invoice-open-total">{formatCurrency(openInvoiceTotal)}</p>
                                    {invoicePaymentsTotal > 0 && (
                                      <p className="text-xs text-gray-500 mt-1" data-testid="text-invoice-payments-total">
                                        Pago: {formatCurrency(invoicePaymentsTotal)}
                                      </p>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Valor do Pagamento</Label>
                                    <Input 
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({...paymentData, amount: formatCurrencyInput(e.target.value)})}
                                        placeholder={formatCurrency(invoiceTotal)}
                                        className="text-lg font-bold"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Conta de Origem</Label>
                                    <Select 
                                        value={paymentData.accountId} 
                                        onValueChange={(v) => setPaymentData({...paymentData, accountId: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Data do Pagamento</Label>
                                    <Input 
                                        type="date"
                                        value={paymentData.date}
                                        onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                                    />
                                </div>

                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handlePayInvoice}>
                                    <Check className="w-4 h-4 mr-2" /> Confirmar Pagamento
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Limit Progress */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Limite Utilizado</span>
                        <span className="font-bold">{Math.round(limitPercentage)}%</span>
                    </div>
                    <Progress value={limitPercentage} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Usado: {formatCurrency(usedLimit)}</span>
                        <span>Total: {formatCurrency(totalLimit)}</span>
                    </div>
                </div>

                {/* Invoice Tabs */}
                <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl mb-4">
                        <TabsTrigger value="current" className="flex-1 rounded-lg">Fatura Atual</TabsTrigger>
                        <TabsTrigger value="future" className="flex-1 rounded-lg">Futuras</TabsTrigger>
                    </TabsList>

                    <TabsContent value="current" className="space-y-4">
                        {(() => {
                            const now = new Date();
                            // Vencimento sempre ocorre no MÊS SEGUINTE à competência.
                            // Ex: competência Janeiro -> vence em 07/02.
                            const dueBase = addMonths(currentInvoiceDate, 1);
                            const dueDate = new Date(dueBase.getFullYear(), dueBase.getMonth(), selectedCard.dueDay);
                            const daysUntilDue = Math.ceil((startOfDay(dueDate).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = isAfter(startOfDay(now), startOfDay(dueDate));
                            const isDueSoon = !isOverdue && daysUntilDue >= 0 && daysUntilDue <= 3;

                            return (
                                <>
                                    {(isOverdue || isDueSoon) && (
                                        <div
                                            className={`rounded-2xl border p-3 flex items-start gap-3 ${isOverdue ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30'}`}
                                            data-testid="status-invoice-alert"
                                        >
                                            <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>{isOverdue ? 'Fatura vencida' : 'Fatura vencendo'}</p>
                                                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-700/80 dark:text-red-300/80' : 'text-yellow-800/80 dark:text-yellow-300/80'}`}>
                                                    {isOverdue ? `Venceu em ${format(dueDate, 'dd/MM')}.` : `Vence em ${daysUntilDue} dia(s) (${format(dueDate, 'dd/MM')}).`}
                                                </p>
                                            </div>
                                            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`h-9 rounded-xl ${isOverdue ? 'border-red-200 bg-white hover:bg-red-50 text-red-700 dark:bg-zinc-900 dark:border-red-900/30 dark:hover:bg-red-900/20' : 'border-yellow-200 bg-white hover:bg-yellow-50 text-yellow-800 dark:bg-zinc-900 dark:border-yellow-900/30 dark:hover:bg-yellow-900/20'}`}
                                                        data-testid="button-pay-invoice-alert"
                                                    >
                                                        Pagar
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Pagar Fatura - {selectedCard.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg text-center">
                                                            <p className="text-sm text-gray-500">Fatura Atual (em aberto)</p>
                                                            <p className="text-2xl font-bold" data-testid="text-invoice-open-total-alert">{formatCurrency(openInvoiceTotal)}</p>
                                                            {invoicePaymentsTotal > 0 && (
                                                              <p className="text-xs text-gray-500 mt-1" data-testid="text-invoice-payments-total-alert">
                                                                Pago: {formatCurrency(invoicePaymentsTotal)}
                                                              </p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Valor do Pagamento</Label>
                                                            <Input
                                                                value={paymentData.amount}
                                                                onChange={(e) => setPaymentData({ ...paymentData, amount: formatCurrencyInput(e.target.value) })}
                                                                placeholder={formatCurrency(invoiceTotal)}
                                                                className="text-lg font-bold"
                                                                data-testid="input-invoice-payment-amount"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Conta de Origem</Label>
                                                            <Select value={paymentData.accountId} onValueChange={(v) => setPaymentData({ ...paymentData, accountId: v })}>
                                                                <SelectTrigger data-testid="select-invoice-payment-account">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {accounts.map((acc) => (
                                                                        <SelectItem key={acc.id} value={acc.id}>
                                                                            {acc.name} ({formatCurrency(acc.balance)})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Data do Pagamento</Label>
                                                            <Input
                                                                type="date"
                                                                value={paymentData.date}
                                                                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                                                                data-testid="input-invoice-payment-date"
                                                            />
                                                        </div>

                                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handlePayInvoice} data-testid="button-confirm-invoice-payment">
                                                            <Check className="w-4 h-4 mr-2" /> Confirmar Pagamento
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setInvoiceTargetDate(null); setInvoiceMonthOffset(prev => prev - 1); }}
                                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                data-testid="button-prev-invoice-month"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                                        {format(currentInvoiceDate, 'MMMM yyyy', { locale: ptBR })}
                                                    </h3>
                                                    <div className="relative">
                                                        <input
                                                            type="month"
                                                            value={format(currentInvoiceDate, 'yyyy-MM')}
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    const [y, m] = e.target.value.split('-').map(Number);
                                                                    setInvoiceMonthOffset(0);
                                                                    setInvoiceTargetDate(new Date(y, m - 1, 1));
                                                                }
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            data-testid="input-invoice-month-picker"
                                                        />
                                                        <Calendar className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500" data-testid="text-invoice-due">
                                                    Vence dia {selectedCard.dueDay}/{format(addMonths(currentInvoiceDate, 1), 'MM')} • Fecha dia {selectedCard.closingDay}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => { setInvoiceTargetDate(null); setInvoiceMonthOffset(prev => prev + 1); }}
                                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                data-testid="button-next-invoice-month"
                                            >
                                                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                            </button>
                                            {(invoiceMonthOffset !== 0 || invoiceTargetDate) && (
                                                <button
                                                    onClick={() => { setInvoiceMonthOffset(0); setInvoiceTargetDate(null); }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 ml-1"
                                                    data-testid="button-reset-invoice-month"
                                                >
                                                    Hoje
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm text-gray-500 block">Total da Fatura</span>
                                            <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-invoice-total">
                                                {formatCurrency(invoiceTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        {/* Transaction List */}
                        <div className="space-y-3">
                            {invoiceItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                                    Nenhuma compra nesta fatura
                                </div>
                            ) : (
                                invoiceItems.map((item, idx) => (
                                    <div
                                        key={`${item.purchase.id}-${idx}`}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800"
                                        data-testid={`row-credit-invoice-item-${item.purchase.id}-${idx}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xl shrink-0"
                                                data-testid={`icon-credit-invoice-item-${item.purchase.id}-${idx}`}
                                            >
                                                {item.purchase.category === 'Alimentação' ? '🍔' : 
                                                 item.purchase.category === 'Transporte' ? '🚗' : '🛍️'}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    className="text-[11px] font-semibold tracking-wide text-primary/80 dark:text-primary/70 uppercase truncate"
                                                    data-testid={`text-credit-invoice-item-category-${item.purchase.id}-${idx}`}
                                                >
                                                    {item.purchase.category}
                                                </p>
                                                <p
                                                    className="font-medium text-gray-900 dark:text-white truncate"
                                                    data-testid={`text-credit-invoice-item-description-${item.purchase.id}-${idx}`}
                                                >
                                                    {item.purchase.description}
                                                </p>
                                                <p
                                                    className="text-xs text-gray-500"
                                                    data-testid={`text-credit-invoice-item-meta-${item.purchase.id}-${idx}`}
                                                >
                                                    {item.purchase.description === 'Anuidade' ? 
                                                        'Cobrança Mensal' : 
                                                        `${format(parseDateSafe(item.purchase.purchaseDate), 'dd/MM')} • Parcela ${item.installment}/${item.purchase.installments}`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className="font-bold text-gray-900 dark:text-white"
                                                data-testid={`text-credit-invoice-item-amount-${item.purchase.id}-${idx}`}
                                            >
                                                {formatCurrency(item.value)}
                                            </span>

                                            {item.purchase.description !== 'Anuidade' && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                            data-testid={`button-credit-invoice-item-actions-${item.purchase.id}-${idx}`}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48" data-testid={`menu-credit-invoice-item-actions-${item.purchase.id}-${idx}`}>
                                                        <DropdownMenuItem
                                                            onClick={() => openEditPurchase(item.purchase)}
                                                            data-testid={`menuitem-credit-invoice-item-edit-${item.purchase.id}-${idx}`}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Editar lançamento
                                                        </DropdownMenuItem>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-700"
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    data-testid={`menuitem-credit-invoice-item-delete-${item.purchase.id}-${idx}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Excluir...
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent data-testid={`dialog-credit-invoice-item-delete-${item.purchase.id}-${idx}`}>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Escolha como deseja excluir este lançamento.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3">
                                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white" data-testid={`text-credit-delete-title-${item.purchase.id}-${idx}`}>
                                                                        {item.purchase.description}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1" data-testid={`text-credit-delete-subtitle-${item.purchase.id}-${idx}`}>
                                                                        {item.purchase.installments > 1 ? `Parcelado em ${item.purchase.installments}x • Remover parcela afeta as futuras no mockup.` : 'À vista'}
                                                                    </div>
                                                                </div>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel data-testid={`button-credit-delete-cancel-${item.purchase.id}-${idx}`}>Cancelar</AlertDialogCancel>
                                                                    <Button
                                                                        variant="outline"
                                                                        onClick={() => handleDeleteInstallmentOnly(item.purchase.id)}
                                                                        data-testid={`button-credit-delete-one-${item.purchase.id}-${idx}`}
                                                                    >
                                                                        Excluir só esta parcela
                                                                    </Button>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        onClick={() => handleDeleteEntirePurchase(item.purchase.id)}
                                                                        data-testid={`button-credit-delete-all-${item.purchase.id}-${idx}`}
                                                                    >
                                                                        Excluir tudo
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="future" className="space-y-4">
                        {futureInvoices.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                Nenhuma fatura futura prevista.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {futureInvoices.map((inv, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                                <span className="font-bold capitalize">{format(inv.date, 'MMMM yyyy', { locale: ptBR })}</span>
                                            </div>
                                            <span className="font-bold text-lg">{formatCurrency(inv.total)}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {inv.items.map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                    <span>{item.purchase.description} ({item.installment}/{item.purchase.installments})</span>
                                                    <span>{formatCurrency(item.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        )}

        {/* Photo Scanner Dialog */}
        <Dialog open={isPhotoScannerOpen} onOpenChange={setIsPhotoScannerOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Escanear Recibo / Fatura</DialogTitle>
              <DialogDescription>
                Leia um recibo individual ou importe toda a fatura do cartão {selectedCard?.name}
              </DialogDescription>
            </DialogHeader>
            <CreditCardPhotoScanner 
              cardId={selectedCard?.id || ''}
              onPurchaseCreated={() => setIsPhotoScannerOpen(false)}
              createPurchase={createCreditPurchaseMutation}
            />
          </DialogContent>
        </Dialog>

        {/* Voice Recorder Dialog */}
        <Dialog open={isVoiceRecorderOpen} onOpenChange={setIsVoiceRecorderOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Comando de Voz</DialogTitle>
              <DialogDescription>
                Fale o valor e descrição da compra para lançar no cartão {selectedCard?.name}
              </DialogDescription>
            </DialogHeader>
            <CreditCardVoiceRecorder 
              cardId={selectedCard?.id || ''}
              onPurchaseCreated={() => setIsVoiceRecorderOpen(false)}
              createPurchase={createCreditPurchaseMutation}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}