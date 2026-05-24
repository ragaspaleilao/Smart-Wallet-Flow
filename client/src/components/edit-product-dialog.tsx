import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BusinessProduct } from "@/lib/store";
import { useUpdateBusinessProduct, useDeleteBusinessProduct } from "@/hooks/use-api";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "@/hooks/use-toast";

interface EditProductDialogProps {
  product: BusinessProduct;
  children: React.ReactNode;
}

export function EditProductDialog({ product, children }: EditProductDialogProps) {
  const updateMutation = useUpdateBusinessProduct();
  const deleteMutation = useDeleteBusinessProduct();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: product.name,
    category: product.category,
    sellingPrice: product.sellingPrice.toString(),
    averageMonthlySales: product.averageMonthlySales.toString(),
    directCosts: [...product.directCosts]
  });
  
  const [newCostName, setNewCostName] = useState("");
  const [newCostValue, setNewCostValue] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setFormData({
        name: product.name,
        category: product.category,
        sellingPrice: product.sellingPrice.toString(),
        averageMonthlySales: product.averageMonthlySales.toString(),
        directCosts: [...product.directCosts]
      });
    }
  }, [open, product]);

  const handleAddCost = () => {
    if (newCostName && newCostValue) {
        setFormData(prev => ({
            ...prev,
            directCosts: [...prev.directCosts, { id: nanoid(), name: newCostName, value: Number(newCostValue) }]
        }));
        setNewCostName("");
        setNewCostValue("");
    }
  };

  const handleRemoveCost = (id: string) => {
    setFormData(prev => ({
        ...prev,
        directCosts: prev.directCosts.filter(c => c.id !== id)
    }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        data: {
          name: formData.name,
          category: formData.category,
          sellingPrice: Number(formData.sellingPrice),
          averageMonthlySales: Number(formData.averageMonthlySales),
          directCosts: formData.directCosts,
        },
      });
      setOpen(false);
      toast({ title: "Produto atualizado!" });
    } catch {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await deleteMutation.mutateAsync(product.id);
        setOpen(false);
        toast({ title: "Produto excluído!" });
      } catch {
        toast({ title: "Erro ao excluir produto", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Hambúrguer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Preço de Venda</Label>
                    <Input type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <Label>Vendas/Mês (Média)</Label>
                    <Input type="number" value={formData.averageMonthlySales} onChange={e => setFormData({...formData, averageMonthlySales: e.target.value})} placeholder="0" />
                </div>
            </div>
            
            <div className="space-y-2 border-t pt-4">
                <Label className="text-blue-600 font-bold">Custos Diretos (Por unidade)</Label>
                <div className="flex gap-2">
                    <Input className="flex-1" value={newCostName} onChange={e => setNewCostName(e.target.value)} placeholder="Item (ex: Carne)" />
                    <Input className="w-24" type="number" value={newCostValue} onChange={e => setNewCostValue(e.target.value)} placeholder="R$" />
                    <Button onClick={handleAddCost} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 bg-gray-50 p-2 rounded-md">
                    {formData.directCosts.map((cost) => (
                        <div key={cost.id} className="flex justify-between items-center text-sm group">
                            <span>{cost.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">R$ {cost.value.toFixed(2)}</span>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 text-red-400 hover:text-red-600" 
                                    onClick={() => handleRemoveCost(cost.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {formData.directCosts.length === 0 && <p className="text-xs text-gray-400 text-center">Nenhum custo adicionado</p>}
                </div>
            </div>

            <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600" onClick={handleSave}>Salvar Alterações</Button>
                <Button 
                    variant="outline" 
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleDelete}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
