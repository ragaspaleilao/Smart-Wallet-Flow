import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFinancialStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Goals() {
  const goals = useFinancialStore((state) => state.goals);
  const addGoal = useFinancialStore((state) => state.addGoal);

  const [open, setOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", current: "" });

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.target) {
        toast({ title: "Preencha todos os campos", variant: "destructive" });
        return;
    }

    addGoal({
        name: newGoal.name,
        target: Number(newGoal.target),
        current: Number(newGoal.current) || 0,
        color: "bg-blue-500", // Default color
    });
    
    setNewGoal({ name: "", target: "", current: "" });
    setOpen(false);
    toast({ title: "Meta criada com sucesso!" });
  };

  const featuredGoal = goals[0];

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-gray-50 dark:bg-black space-y-6">
        <div className="flex justify-between items-center pt-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
            <p className="text-gray-500 text-sm">Realize seus sonhos</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                    <Plus className="w-6 h-6" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Meta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nome da Meta</Label>
                        <Input 
                            placeholder="Ex: Viagem para Disney" 
                            value={newGoal.name}
                            onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Alvo (R$)</Label>
                        <Input 
                            type="number" 
                            placeholder="5000" 
                            value={newGoal.target}
                            onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Já guardado (R$)</Label>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            value={newGoal.current}
                            onChange={(e) => setNewGoal({...newGoal, current: e.target.value})}
                        />
                    </div>
                    <Button className="w-full" onClick={handleAddGoal}>Criar Meta</Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Featured Goal */}
        {featuredGoal && (
            <div className="bg-primary p-6 rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden">
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
                <p className="text-primary-foreground/80 text-sm">Falta R$ {(featuredGoal.target - featuredGoal.current).toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-white/80">
                    <span>R$ {featuredGoal.current.toLocaleString('pt-BR')}</span>
                    <span>{Math.round((featuredGoal.current / featuredGoal.target) * 100)}%</span>
                </div>
                <Progress value={(featuredGoal.current / featuredGoal.target) * 100} className="h-2 bg-black/20" indicatorClassName="bg-white" />
                </div>
            </div>
            </div>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Em andamento</h3>
          {goals.length > 1 ? goals.slice(1).map((goal) => (
            <Card key={goal.id} className="p-4 border-none shadow-sm bg-white dark:bg-zinc-900">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${goal.color} bg-opacity-10 text-opacity-100 flex items-center justify-center`}>
                  <Target className={`w-6 h-6 ${goal.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 dark:text-white">{goal.name}</h4>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      {Math.round((goal.current / goal.target) * 100)}%
                    </span>
                  </div>
                  <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>R$ {goal.current}</span>
                    <span>Meta: R$ {goal.target}</span>
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
