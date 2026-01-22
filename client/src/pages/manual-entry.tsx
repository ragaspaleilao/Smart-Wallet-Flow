import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calculator } from "lucide-react";
import { useState } from "react";
import { useFinancialStore, Category } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function ManualEntry() {
  const [_, setLocation] = useLocation();
  const addTransaction = useFinancialStore((state) => state.addTransaction);
  
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Alimentação");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const formatCurrency = (val: string) => {
    // Simple mock formatter
    const number = val.replace(/\D/g, "");
    const formatted = (Number(number) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return formatted;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrency(e.target.value));
  };

  const handleSave = () => {
    // Parse amount from formatted string (e.g., "R$ 1.234,56")
    const numericAmount = Number(amount.replace(/[^0-9,]/g, "").replace(",", ".")) / 100;

    if (!numericAmount || numericAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!description) {
       toast({
        title: "Descrição obrigatória",
        description: "Por favor, informe uma descrição.",
        variant: "destructive",
      });
      return;
    }

    addTransaction({
      amount: numericAmount,
      type,
      category,
      description,
      source: "manual",
      isPersonal: true, // Defaulting to personal for now
    });

    toast({
      title: "Salvo com sucesso!",
      description: `${type === "expense" ? "Despesa" : "Receita"} de R$ ${numericAmount.toFixed(2)} registrada.`,
    });

    setLocation("/dashboard");
  };

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col p-6 bg-white dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">Novo Lançamento</h1>
          <div className="w-10" />
        </div>

        {/* Type Switcher */}
        <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-8">
          <button
            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
              type === "expense"
                ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => setType("expense")}
          >
            Despesa
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${
              type === "income"
                ? "bg-white dark:bg-zinc-700 text-green-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => setType("income")}
          >
            Receita
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-8">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Valor</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="R$ 0,00"
              className={`text-4xl font-bold h-20 border-none px-0 shadow-none focus-visible:ring-0 ${
                type === 'expense' ? 'text-red-600 placeholder:text-red-200' : 'text-green-600 placeholder:text-green-200'
              }`}
              value={amount}
              onChange={handleAmountChange}
              autoFocus
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Almoço, Uber, Salário" 
              className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Salário", "Vendas", "Serviços", "Outros"].map((cat) => (
                <button 
                  key={cat} 
                  className={`px-4 py-2 border rounded-full text-sm whitespace-nowrap transition-colors ${
                    category === cat 
                      ? "bg-primary text-white border-primary" 
                      : "bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-primary hover:text-primary"
                  }`}
                  onClick={() => setCategory(cat as Category)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input 
              type="date" 
              className="h-12 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6">
          <Button size="lg" className="w-full h-14 text-lg bg-primary hover:bg-primary/90" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
