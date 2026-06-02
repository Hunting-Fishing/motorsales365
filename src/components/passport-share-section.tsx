import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Link2, Printer, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PassportShareSection({ url, vehicleName }: { url: string; vehicleName: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicleName} — Vehicle Passport`,
          text: `Check out the verified service history for ${vehicleName}.`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  }, [url, vehicleName, handleCopy]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Share passport</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border border-border bg-white p-4">
              <QRCodeSVG
                value={url}
                size={180}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
                imageSettings={undefined}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Scan to view verified service history
            </p>
            <div className="flex w-full gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              {typeof navigator.share === "function" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={handleNativeShare}
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>

      <Button variant="ghost" size="sm" className="gap-1.5 print:hidden" onClick={handleCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
