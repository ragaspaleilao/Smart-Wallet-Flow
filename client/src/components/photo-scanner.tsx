import { useState, useRef } from "react";
import { Camera, X, Loader2, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface OCRResult {
  amount: number | null;
  description: string | null;
  category: string | null;
  date: string | null;
  merchant: string | null;
  confidence: number;
  rawText: string;
}

interface PhotoScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionExtracted: (data: {
    amount: number;
    description: string;
    category: string;
    date: string;
  }) => void;
}

export function PhotoScanner({ open, onOpenChange, onTransactionExtracted }: PhotoScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    if (!result) return;
    
    onTransactionExtracted({
      amount: result.amount || 0,
      description: result.merchant || result.description || "Compra",
      category: result.category || "Outros",
      date: result.date || new Date().toISOString().split('T')[0],
    });
    
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escanear Cupom/Nota
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div className="space-y-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-camera-capture"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-select"
              />
              
              <Button
                className="w-full h-24 flex flex-col gap-2"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                data-testid="button-open-camera"
              >
                <Camera className="w-8 h-8" />
                <span>Tirar Foto</span>
              </Button>
              
              <Button
                className="w-full h-16 flex items-center gap-2"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-gallery"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Escolher da Galeria</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full max-h-48 object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Analisando com IA...</p>
                    </div>
                  </div>
                )}
              </div>

              {result && !isProcessing && (
                <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Dados Extraídos:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Valor:</span>
                      <p className="font-bold text-lg">
                        {result.amount ? `R$ ${result.amount.toFixed(2)}` : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Data:</span>
                      <p>{result.date || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Local:</span>
                      <p>{result.merchant || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Categoria:</span>
                      <p>{result.category || '-'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Confiança: {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                  data-testid="button-retake-photo"
                >
                  <X className="w-4 h-4 mr-1" />
                  Nova Foto
                </Button>
                {result && result.amount && (
                  <Button
                    className="flex-1"
                    onClick={confirmTransaction}
                    data-testid="button-confirm-ocr"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
