import { MobileLayout } from "@/components/mobile-layout";
import { goals } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Goals() {
  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full p-6 bg-gray-50 dark:bg-black space-y-6">
        <div className="flex justify-between items-center pt-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
            <p className="text-gray-500 text-sm">Realize seus sonhos</p>
          </div>
          <Button size="icon" className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* Featured Goal */}
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
              <h3 className="text-xl font-bold">Viagem Fim de Ano</h3>
              <p className="text-primary-foreground/80 text-sm">Falta R$ 3.750,00</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-white/80">
                <span>R$ 1.250</span>
                <span>25%</span>
              </div>
              <Progress value={25} className="h-2 bg-black/20" indicatorClassName="bg-white" />
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Em andamento</h3>
          {goals.slice(1).map((goal) => (
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
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
