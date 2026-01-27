import { MobileLayout } from "@/components/mobile-layout";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy, Edit2, Wallet, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFinancialStore, Goal } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Goals() {
  const goals = useFinancialStore((state) => state.goals);
  const accounts = useFinancialStore((state) => state.accounts);
  const addGoal = useFinancialStore((state) => state.addGoal);
  const updateGoal = useFinancialStore((state) => state.updateGoal);
  const removeGoal = useFinancialStore((state) => state.removeGoal);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    name: string;
    target: string;
    current: string;
    linkedAccountId: string;
  }>({ name: "", target: "", current: "", linkedAccountId: "none" });

  const handleOpen = (goal?: Goal) => {
    if (goal) {
        setEditingId(goal.id);
        setFormState({
            name: goal.name,
            target: goal.target.toString(),
            current: goal.current.toString(),
            linkedAccountId: goal.linkedAccountId || "none"
        });
    } else {
        setEditingId(null);
        setFormState({ name: "", target: "", current: "", linkedAccountId: "none" });
    }
    setOpen(true);
  };

  const handleDelete = () => {
    if (editingId) {
        removeGoal(editingId);
        toast({ title: "Meta excluída!" });
        setOpen(false);
    }
  };

  const handleSaveGoal = () => {
    if (!formState.name || !formState.target) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    const linkedAccount = accounts.find(a => a.id === formState.linkedAccountId);
    const currentVal = linkedAccount 
        ? linkedAccount.balance 
        : (Number(formState.current) || 0);

    const goalData = {
        name: formState.name,
        target: Number(formState.target),
        current: currentVal,
        color: "bg-blue-500", // Default color
        linkedAccountId: formState.linkedAccountId === "none" ? undefined : formState.linkedAccountId
    };

    if (editingId) {
        updateGoal(editingId, goalData);
        toast({ title: "Meta atualizada!" });
    } else {
        addGoal(goalData);
        toast({ title: "Meta criada com sucesso!" });
    }
    
    setOpen(false);
  };

  // Sort goals so the one with highest progress or priority is first if needed
  // For now keeping array order but calculating current values dynamically if linked
  const processedGoals = goals.map(g => {
      if (g.linkedAccountId) {
          const account = accounts.find(a => a.id === g.linkedAccountId);
          return { ...g, current: account ? account.balance : g.current };
      }
      return g;
  });

  const featuredGoal = processedGoals[0];

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-gray-50 dark:bg-black space-y-6">
        <div className="flex justify-between items-center pt-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
            <p className="text-gray-500 text-sm">Realize seus sonhos</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="icon" className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" onClick={() => handleOpen()}>
                <Plus className="w-6 h-6" />
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingId ? "Editar Meta" : "Nova Meta"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome da Meta</Label>
                        <Input 
                            placeholder="Ex: Viagem para Disney" 
                            value={formState.name}
                            onChange={(e) => setFormState({...formState, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Alvo (R$)</Label>
                        <Input 
                            type="number" 
                            placeholder="5000" 
                            value={formState.target}
                            onChange={(e) => setFormState({...formState, target: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Vincular a uma Conta (Opcional)</Label>
                        <Select 
                            value={formState.linkedAccountId} 
                            onValueChange={(val) => setFormState({...formState, linkedAccountId: val})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma conta..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Não vincular (Manual)</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {formState.linkedAccountId !== "none" && (
                            <p className="text-xs text-blue-500">
                                O valor da meta será atualizado automaticamente com o saldo desta conta.
                            </p>
                        )}
                    </div>

                    {formState.linkedAccountId === "none" && (
                        <div className="space-y-2">
                            <Label>Já guardado (R$)</Label>
                            <Input 
                                type="number" 
                                placeholder="0" 
                                value={formState.current}
                                onChange={(e) => setFormState({...formState, current: e.target.value})}
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        {editingId && (
                            <Button variant="destructive" size="icon" onClick={handleDelete} className="shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        )}
                        <Button className="w-full" onClick={handleSaveGoal}>
                            {editingId ? "Salvar Alterações" : "Criar Meta"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Featured Goal */}
        {featuredGoal && (
            <div 
                className="bg-primary p-6 rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                onClick={() => handleOpen(featuredGoal)}
            >
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white/90">Principal</span>
                </div>
                <div>
                <h3 className="text-xl font-bold">{featuredGoal.name}</h3>
                <p className="text-primary-foreground/80 text-sm">Falta {formatCurrency(Math.max(0, featuredGoal.target - featuredGoal.current))}</p>
                </div>
                <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-white/80">
                    <div className="flex items-center gap-1">
                        <span>{formatCurrency(featuredGoal.current)}</span>
                        {featuredGoal.linkedAccountId && <Wallet className="w-3 h-3 text-white/70" />}
                    </div>
                    <span>{Math.min(100, Math.round((featuredGoal.current / featuredGoal.target) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, (featuredGoal.current / featuredGoal.target) * 100)} className="h-2 bg-black/20" indicatorClassName="bg-white" />
                </div>
            </div>
            </div>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Em andamento</h3>
          {processedGoals.length > 1 ? processedGoals.slice(1).map((goal) => (
            <Card 
                key={goal.id} 
                className="p-4 border-none shadow-sm bg-white dark:bg-zinc-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => handleOpen(goal)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${goal.color} bg-opacity-10 text-opacity-100 flex items-center justify-center`}>
                  <Target className={`w-6 h-6 ${goal.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 dark:text-white">{goal.name}</h4>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      {Math.min(100, Math.round((goal.current / goal.target) * 100))}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, (goal.current / goal.target) * 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <span>{formatCurrency(goal.current)}</span>
                        {goal.linkedAccountId && <Wallet className="w-3 h-3 text-gray-400" />}
                    </div>
                    <span>Meta: {formatCurrency(goal.target)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )) : (
            <p className="text-sm text-gray-500">Nenhuma outra meta criada.</p>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
