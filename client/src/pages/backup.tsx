import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Cloud, Download, Upload, ShieldCheck, Lock, Database, HardDrive, FileJson, Trash2, Clock } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { getUserId } from "@/lib/api";
import { useAccounts, useTransactions, useCreditCards, useSubscriptions, useVehicles, useGoals, useInvestments, useBackups, useCreateBackup, useDeleteBackup } from "@/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";

interface BackupData {
  version: string;
  exportDate: string;
  accounts: any[];
  transactions: any[];
  creditCards: any[];
  subscriptions: any[];
  vehicles: any[];
  goals: any[];
  investments: any[];
}

export default function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: backupHistory = [] } = useBackups();
  const createBackupRecord = useCreateBackup();
  const deleteBackupRecord = useDeleteBackup();

  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: creditCards = [] } = useCreditCards();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: vehicles = [] } = useVehicles();
  const { data: goals = [] } = useGoals();
  const { data: investments = [] } = useInvestments();

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      setProgress(20);
      await new Promise(r => setTimeout(r, 300));

      const backupData: BackupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        accounts,
        transactions,
        creditCards,
        subscriptions,
        vehicles,
        goals,
        investments,
      };

      setProgress(60);
      await new Promise(r => setTimeout(r, 300));

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `backup-financeiro-${date}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);

      // Record the backup in history
      const sizeKb = Math.max(1, Math.round(jsonString.length / 1024));
      const sizeStr = sizeKb >= 1024
        ? `${(sizeKb / 1024).toFixed(2)} MB`
        : `${sizeKb} KB`;
      const device = (typeof navigator !== 'undefined' && navigator.userAgent)
        ? navigator.userAgent.includes('Mobile') ? 'Celular' : 'Computador'
        : 'Desconhecido';
      try {
        await createBackupRecord.mutateAsync({ size: sizeStr, device, auto: false });
      } catch {
        // Non-fatal: history record is optional
      }

      toast({ 
        title: "Backup exportado!", 
        description: `Arquivo ${filename} salvo no seu computador.` 
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ 
        title: "Erro ao exportar", 
        description: "Não foi possível gerar o arquivo de backup.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ 
        title: "Arquivo inválido", 
        description: "Selecione um arquivo .json de backup.",
        variant: "destructive"
      });
      return;
    }

    const confirmImport = window.confirm(
      "Importar um backup irá adicionar apenas dados NOVOS ao seu banco.\n\n" +
      "Dados que já existem serão ignorados automaticamente (sem duplicatas).\n\n" +
      "Deseja continuar?"
    );

    if (!confirmImport) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    setProgress(0);

    try {
      setProgress(10);
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.exportDate) {
        throw new Error('Arquivo de backup inválido');
      }

      setProgress(20);
      const userId = getUserId();
      if (!userId) throw new Error('Não autenticado');

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      };

      let imported = { accounts: 0, transactions: 0, creditCards: 0, subscriptions: 0, vehicles: 0, goals: 0, investments: 0 };
      let skipped = { accounts: 0, transactions: 0, creditCards: 0, subscriptions: 0, vehicles: 0, goals: 0, investments: 0 };

      const existingAccounts = accounts;
      const existingTransactions = transactions;
      const existingCreditCards = creditCards;
      const existingSubscriptions = subscriptions;
      const existingVehicles = vehicles;
      const existingGoals = goals;
      const existingInvestments = investments;

      setProgress(30);
      for (const account of backupData.accounts || []) {
        const isDuplicate = existingAccounts.some(
          (a: any) => a.name === account.name && a.type === account.type
        );
        if (isDuplicate) { skipped.accounts++; continue; }
        try {
          await fetch('/api/accounts', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: account.name,
              type: account.type,
              balance: account.balance,
              color: account.color || '#22c55e',
              initialBalance: account.initialBalance || account.balance,
            }),
          });
          imported.accounts++;
        } catch (e) { console.error('Import account error:', e); }
      }

      setProgress(50);
      for (const transaction of backupData.transactions || []) {
        const txDate = new Date(transaction.date).toISOString().split('T')[0];
        const txAmount = String(parseFloat(transaction.amount));
        const isDuplicate = existingTransactions.some(
          (t: any) => t.description === transaction.description && 
            String(parseFloat(t.amount)) === txAmount &&
            new Date(t.date).toISOString().split('T')[0] === txDate &&
            t.type === transaction.type
        );
        if (isDuplicate) { skipped.transactions++; continue; }
        try {
          await fetch('/api/transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              description: transaction.description,
              amount: transaction.amount,
              type: transaction.type,
              category: transaction.category,
              date: transaction.date,
              accountId: null,
              status: transaction.status || 'paid',
              source: transaction.source || 'manual',
            }),
          });
          imported.transactions++;
        } catch (e) { console.error('Import transaction error:', e); }
      }

      setProgress(70);
      for (const card of backupData.creditCards || []) {
        const isDuplicate = existingCreditCards.some(
          (c: any) => c.name === card.name
        );
        if (isDuplicate) { skipped.creditCards++; continue; }
        try {
          await fetch('/api/credit-cards', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: card.name,
              creditLimit: card.creditLimit,
              closingDay: card.closingDay,
              dueDay: card.dueDay,
              color: card.color || '#3b82f6',
            }),
          });
          imported.creditCards++;
        } catch (e) { console.error('Import credit card error:', e); }
      }

      setProgress(80);
      for (const sub of backupData.subscriptions || []) {
        const isDuplicate = existingSubscriptions.some(
          (s: any) => s.name === sub.name
        );
        if (isDuplicate) { skipped.subscriptions++; continue; }
        try {
          await fetch('/api/subscriptions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: sub.name,
              price: sub.price,
              date: sub.date,
              logo: sub.logo || '📱',
              color: sub.color || '#8b5cf6',
              category: sub.category || 'Outros',
            }),
          });
          imported.subscriptions++;
        } catch (e) { console.error('Import subscription error:', e); }
      }

      setProgress(85);
      for (const vehicle of backupData.vehicles || []) {
        const isDuplicate = existingVehicles.some(
          (v: any) => v.name === vehicle.name || (vehicle.plate && v.plate === vehicle.plate)
        );
        if (isDuplicate) { skipped.vehicles++; continue; }
        try {
          await fetch('/api/vehicles', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: vehicle.name,
              plate: vehicle.plate,
            }),
          });
          imported.vehicles++;
        } catch (e) { console.error('Import vehicle error:', e); }
      }

      setProgress(90);
      for (const goal of backupData.goals || []) {
        const isDuplicate = existingGoals.some(
          (g: any) => g.name === goal.name
        );
        if (isDuplicate) { skipped.goals++; continue; }
        try {
          await fetch('/api/goals', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: goal.name,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount || '0',
              deadline: goal.deadline,
              icon: goal.icon || '🎯',
              color: goal.color || '#22c55e',
            }),
          });
          imported.goals++;
        } catch (e) { console.error('Import goal error:', e); }
      }

      setProgress(95);
      for (const investment of backupData.investments || []) {
        const isDuplicate = existingInvestments.some(
          (i: any) => i.name === investment.name && i.institution === investment.institution
        );
        if (isDuplicate) { skipped.investments++; continue; }
        try {
          await fetch('/api/investments', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: investment.name,
              type: investment.type,
              institution: investment.institution,
              amount: investment.amount,
              returnRate: investment.returnRate || '0',
              startDate: investment.startDate,
            }),
          });
          imported.investments++;
        } catch (e) { console.error('Import investment error:', e); }
      }

      setProgress(100);
      
      queryClient.invalidateQueries();

      const totalImported = imported.accounts + imported.transactions + imported.creditCards + 
        imported.subscriptions + imported.vehicles + imported.goals + imported.investments;
      const totalSkipped = skipped.accounts + skipped.transactions + skipped.creditCards + 
        skipped.subscriptions + skipped.vehicles + skipped.goals + skipped.investments;

      const parts = [];
      if (imported.accounts > 0) parts.push(`${imported.accounts} contas`);
      if (imported.transactions > 0) parts.push(`${imported.transactions} transações`);
      if (imported.creditCards > 0) parts.push(`${imported.creditCards} cartões`);
      if (imported.subscriptions > 0) parts.push(`${imported.subscriptions} assinaturas`);
      if (imported.vehicles > 0) parts.push(`${imported.vehicles} veículos`);
      if (imported.goals > 0) parts.push(`${imported.goals} metas`);
      if (imported.investments > 0) parts.push(`${imported.investments} investimentos`);

      const description = totalImported > 0
        ? `Importados: ${parts.join(', ')}.${totalSkipped > 0 ? ` ${totalSkipped} itens já existiam e foram ignorados.` : ''}`
        : `Nenhum dado novo encontrado. ${totalSkipped} itens já existiam no seu banco.`;

      toast({ 
        title: totalImported > 0 ? "Backup importado!" : "Nenhum dado novo",
        description,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({ 
        title: "Erro ao importar", 
        description: error.message || "Não foi possível ler o arquivo de backup.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
      event.target.value = '';
    }
  };

  const totalItems = accounts.length + transactions.length + creditCards.length + 
                     subscriptions.length + vehicles.length + goals.length + investments.length;

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
                    <Lock className="w-3 h-3" /> Salvos automaticamente na nuvem
                </p>
            </div>
         </div>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-black -mt-6 rounded-t-3xl relative z-20 px-6 pt-8 pb-24">
        
        <Card className="p-5 border-none shadow-lg mb-6 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Backup na Nuvem</h3>
              <p className="text-sm text-gray-500">Automático e sempre atualizado</p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
            ✓ {totalItems} itens salvos automaticamente
          </div>
        </Card>

        <Card className="p-5 border-none shadow-lg mb-6 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Backup Local</h3>
              <p className="text-sm text-gray-500">Salve uma cópia no seu computador</p>
            </div>
          </div>

          {(isExporting || isImporting) && (
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{isExporting ? 'Exportando...' : 'Importando...'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleExport} 
              disabled={isExporting || isImporting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button 
              onClick={handleImportClick} 
              disabled={isExporting || isImporting}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />
        </Card>

        {backupHistory.length > 0 && (
          <Card className="p-5 border-none shadow-lg mb-6 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="font-bold text-gray-900 dark:text-white">Histórico de Backups</h3>
            </div>
            <div className="space-y-2">
              {backupHistory.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg" data-testid={`row-backup-${b.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(b.date).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">{b.device} • {b.size} {b.auto ? '• Auto' : ''}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                    onClick={() => deleteBackupRecord.mutate(b.id)}
                    data-testid={`button-delete-backup-${b.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
          <div className="flex gap-3">
            <FileJson className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
              <p className="font-bold mb-1">Como funciona:</p>
              <ul className="space-y-1">
                <li><strong>Exportar:</strong> Baixa arquivo .json com todos os dados</li>
                <li><strong>Importar:</strong> Restaura dados de um arquivo .json</li>
                <li><strong>Nuvem:</strong> Seus dados já são salvos automaticamente</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
