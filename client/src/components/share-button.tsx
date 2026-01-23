import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ShareButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
  text?: string;
}

export function ShareButton({ 
  variant = "ghost", 
  size = "icon", 
  className,
  showText = false,
  text = "Compartilhar com amigos"
}: ShareButtonProps) {
  
  const handleShare = async () => {
    const shareData = {
      title: 'FinSmart App',
      text: 'Gostei muito desse app para organizar minhas finanças. Baixa aqui 👇',
      url: window.location.origin // In a real app this would be the store link
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast({ title: "Link copiado para a área de transferência!" });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={showText ? "default" : size} 
      className={className} 
      onClick={handleShare}
    >
      <Share2 className={`w-5 h-5 ${showText ? "mr-2" : ""}`} />
      {showText && text}
    </Button>
  );
}
