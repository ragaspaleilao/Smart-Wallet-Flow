import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useFinancialStore } from "@/lib/store";
import { ArrowLeft, Cloud, CloudRain, Database, Download, FileJson, History, Lock, RefreshCw, Shield, ShieldCheck, Upload } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { nanoid } from "nanoid";

export default function Backup() {
  const { backups, lastBackupDate, isAutoBackupEnabled, addBackup, toggleAutoBackup } = useFinancialStore();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const handleManualBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    // Simulate backup steps
    const steps = [
        { progress: 20, msg: "Coletando dados..." },
        { progress: 50, msg: "Criptografando informações..." },
        { progress: 80, msg: "Enviando para nuvem..." },
        { progress: 100, msg: "Concluído!" }
    ];

    let stepIndex = 0;
    
    const interval = setInterval(() => {
        if (stepIndex >= steps.length) {
            clearInterval(interval);
            
            // Finish
            const newBackup = {
                id: nanoid(),
                date: new Date().toISOString(),
                size: `${(Math.random() * 2 + 0.5).toFixed(2)} MB`,
                device: 'Este Dispositivo',
                auto: false
            };
            
            addBackup(newBackup);
            setIsBackingUp(false);
            toast({ title: "Backup realizado com sucesso!", description: "Seus dados estão seguros na nuvem." });
            return;
        }

        setBackupProgress(steps[stepIndex].progress);
        stepIndex++;
    }, 800);
  };

  const handleRestore = (id: string) => {
    const confirm = window.confirm("ATENÇÃO: Restaurar um backup substituirá todos os dados atuais. Deseja continuar?");
    if (confirm) {
        toast({ title: "Restaurando dados...", description: "Isso pode levar alguns segundos." });
        setTimeout(() => {
            toast({ title: "Restauração concluída!", description: "Seus dados foram recuperados com sucesso." });
        }, 2000);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="bg-blue-600 min-h-[30vh] p-6 text-white relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/settings">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold">Backup e Segurança</h1>
            </div>
            
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm relative">
                    <Cloud className="w-10 h-10 text-white" />
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 border-2 border-blue-600">
                        <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                </div>
                <h2 className="text-xl font-bold">Seus dados estão protegidos</h2>
                <p className="text-blue-100 text-sm mt-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Criptografia de ponta a ponta
                </p>
            </div>
         </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-black -mt-6 rounded-t-3xl relative z-20 px-6 pt-8 pb-24">
        
        {/* Backup Status Card */}
        <Card className="p-5 border-none shadow-lg mb-6 bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Último Backup</p>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        {lastBackupDate ? format(new Date(lastBackupDate), "dd 'de' MMMM, HH:mm") : "Nunca realizado"}
                    </h3>
                </div>
                <div className={`w-3 h-3 rounded-full ${lastBackupDate ? 'bg-green-500' : 'bg-orange-500'}`} />
            </div>

            {isBackingUp ? (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Realizando backup...</span>
                        <span>{backupProgress}%</span>
                    </div>
                    <Progress value={backupProgress} className="h-2" />
                </div>
            ) : (
                <Button onClick={handleManualBackup} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Upload className="w-4 h-4" />
                    Fazer Backup Agora
                </Button>
            )}
        </Card>

        {/* Automatic Backup Toggle */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 mb-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                    <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Backup Automático</h3>
                    <p className="text-xs text-gray-500">Salvar diariamente</p>
                </div>
            </div>
            <Switch checked={isAutoBackupEnabled} onCheckedChange={toggleAutoBackup} />
        </div>

        {/* Backup History */}
        <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Histórico de Backups
            </h3>

            <div className="space-y-3">
                {backups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-200">
                        <CloudRain className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>Nenhum backup encontrado.</p>
                    </div>
                ) : (
                    backups.map((backup) => (
                        <div key={backup.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500">
                                    <FileJson className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">Backup {backup.auto ? 'Automático' : 'Manual'}</p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(backup.date), "dd/MM/yyyy • HH:mm")} • {backup.size}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => handleRestore(backup.id)}>
                                Restaurar
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
            <Shield className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
                <span className="font-bold">Nota de Segurança:</span> Todos os seus dados são criptografados antes de serem enviados para nossos servidores seguros. Ninguém além de você tem acesso às suas informações financeiras.
            </p>
        </div>

      </div>
    </MobileLayout>
  );
}
