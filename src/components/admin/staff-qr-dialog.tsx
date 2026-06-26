import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteOrigin } from "@/lib/site-config";

type Props = {
  code: string;
  name: string | null;
  email: string;
  active: boolean;
};

export function StaffQrDialog({ code, name, email, active }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const link = `${siteOrigin()}/r/${code}`;

  useEffect(() => {
    if (!open || dataUrl) return;
    let cancelled = false;
    QRCode.toDataURL(link, { width: 900, margin: 2, errorCorrectionLevel: "H" })
      .then((png) => {
        if (!cancelled) setDataUrl(png);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to generate QR");
      });
    return () => {
      cancelled = true;
    };
  }, [open, dataUrl, link]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        title={`View QR for ${name ?? email}`}
      >
        <QrCode className="mr-1 h-4 w-4" />
        QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR code — {name ?? email}</DialogTitle>
            <DialogDescription>
              Code <span className="font-mono">{code}</span>
              {!active && (
                <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                  inactive
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR for ${code}`}
                className="h-72 w-72 rounded-md border border-border bg-white p-3"
              />
            ) : (
              <div className="h-72 w-72 animate-pulse rounded-md bg-muted" />
            )}
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs text-primary hover:underline"
            >
              {link}
            </a>
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                toast.success("Link copied");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy link
            </Button>
            {dataUrl && (
              <a href={dataUrl} download={`${code}-qr.png`}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-4 w-4" /> Download PNG
                </Button>
              </a>
            )}
            <Link to="/r/$code/poster" params={{ code }} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="mr-1 h-4 w-4" /> Print poster
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
