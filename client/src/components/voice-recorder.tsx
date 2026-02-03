import { useState, useRef } from "react";
import { Mic, Square, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface VoiceResult {
  text: string;
  transaction: {
    amount: number | null;
    description: string | null;
    category: string | null;
    type: "income" | "expense" | null;
  };
}

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionExtracted: (data: {
    amount: number;
    description: string;
    category: string;
    type: "income" | "expense";
  }) => void;
}

export function VoiceRecorder({ open, onOpenChange, onTransactionExtracted }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
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
        
        const response = await apiClient<VoiceResult>('/api/voice', {
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
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      toast({ title: "Erro ao processar áudio", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTransaction = () => {
    if (!result?.transaction) return;
    
    const { amount, description, category, type } = result.transaction;
    
    onTransactionExtracted({
      amount: amount || 0,
      description: description || "Transação por voz",
      category: category || "Outros",
      type: type || "expense",
    });
    
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setResult(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Comando de Voz
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Diga algo como: "Gastei 50 reais no supermercado" ou "Recebi 1500 de salário"
          </div>

          {!result ? (
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
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-gray-500 text-xs">Você disse:</span>
                  <p className="font-medium italic">"{result.text}"</p>
                </div>
                
                {result.transaction.amount && (
                  <>
                    <hr className="border-gray-200 dark:border-zinc-700" />
                    <h4 className="font-semibold text-sm">Transação Identificada:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <p className={result.transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {result.transaction.type === 'income' ? '📈 Receita' : '📉 Despesa'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <p className="font-bold text-lg">
                          R$ {result.transaction.amount?.toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Descrição:</span>
                        <p>{result.transaction.description || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Categoria:</span>
                        <p>{result.transaction.category || '-'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetState}
                  data-testid="button-retry-voice"
                >
                  <X className="w-4 h-4 mr-1" />
                  Tentar Novamente
                </Button>
                {result.transaction.amount && (
                  <Button
                    className="flex-1"
                    onClick={confirmTransaction}
                    data-testid="button-confirm-voice"
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
