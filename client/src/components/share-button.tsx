import { Share2, QrCode, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  text = "Compartilhar com amigos",
  customUrl,
  customTitle,
  customMessage
}: ShareButtonProps & { customUrl?: string, customTitle?: string, customMessage?: string }) {
  const [showQrDialog, setShowQrDialog] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const shareUrl = customUrl || window.location.origin;
  const shareTitle = customTitle || 'Xô Preguiça App';
  const shareMessage = customMessage || 'Gostei muito desse app para organizar minhas finanças. Baixa aqui 👇';

  const handleShare = async () => {
    const shareData = {
      title: shareTitle,
      text: shareMessage,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast({ title: "Link copiado para a área de transferência!" });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado!" });
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  const handleDownloadQr = useCallback(() => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = "xo-preguica-qrcode.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "QR Code baixado!" });
    };
    img.src = url;
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant={variant} 
        size={showText ? "default" : size} 
        className={className} 
        onClick={handleShare}
        data-testid="button-share"
      >
        <Share2 className={`w-5 h-5 ${showText ? "mr-2" : ""}`} />
        {showText && text}
      </Button>

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogTrigger asChild>
          <Button 
            variant={variant} 
            size={showText ? "default" : "icon"} 
            className={showText ? "" : className}
            data-testid="button-share-qrcode"
          >
            <QrCode className="w-5 h-5" />
            {showText && <span className="ml-2">QR Code</span>}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Compartilhar via QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-sm">
              <QRCodeSVG 
                value={shareUrl} 
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#1a1a2e"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[280px]">
              Aponte a câmera do celular para o QR Code para acessar o app
            </p>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar link
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleDownloadQr}
                data-testid="button-download-qr"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
