import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Printer, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { BrandLogo } from "@/components/brand-logo";
import logoSrc from "@/assets/logo-small.webp";
import { formatPHP } from "@/lib/format";

interface ListingQrProps {
  listingId: string;
  title: string;
  pricePhp?: number;
  location?: string | null;
  coverUrl?: string | null;
  /** Optional override; defaults to current origin */
  baseUrl?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerLabel?: string;
  className?: string;
  compact?: boolean;
}

function getListingUrl(id: string, baseUrl?: string) {
  const origin =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com");
  return `${origin.replace(/\/$/, "")}/listing/${id}`;
}

export function ListingQr({
  listingId,
  title,
  pricePhp,
  location,
  coverUrl,
  baseUrl,
  triggerVariant = "outline",
  triggerLabel = "QR & Poster",
  className,
  compact = false,
}: ListingQrProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const url = getListingUrl(listingId, baseUrl);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 600,
      color: { dark: "#0b2a6b", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => toast.error("Could not generate QR code"));
  }, [open, url]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `365motorsales-${listingId}-qr.png`;
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
    } else {
      copyLink();
    }
  };

  const printPoster = () => {
    if (!qrDataUrl) return;
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) {
      toast.error("Please allow pop-ups to print the poster");
      return;
    }
    const priceLine = pricePhp ? formatPHP(pricePhp) : "";
    const coverHtml = coverUrl ? `<img class="cover" src="${coverUrl}" alt="" />` : "";
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8" />
<title>${escapeHtml(title)} — 365 MotorSales</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, Arial, sans-serif; margin: 0; color: #0f172a; }
  .poster { width: 100%; max-width: 794px; margin: 0 auto; padding: 24px; }
  .top { display: flex; align-items: center; gap: 16px; border-bottom: 4px solid #1d4ed8; padding-bottom: 16px; }
  .top img { height: 72px; width: 72px; object-fit: contain; }
  .top .brand { font-size: 22px; font-weight: 800; line-height: 1.05; }
  .top .brand small { display: block; font-size: 11px; letter-spacing: 0.18em; color: #64748b; text-transform: uppercase; font-weight: 700; }
  .cover { width: 100%; height: 360px; object-fit: cover; border-radius: 14px; margin: 20px 0; border: 1px solid #e2e8f0; }
  .title { font-size: 32px; font-weight: 800; line-height: 1.15; margin: 8px 0; }
  .meta { color: #475569; font-size: 16px; margin-bottom: 4px; }
  .price { font-size: 36px; font-weight: 800; color: #1d4ed8; margin: 12px 0 24px; }
  .qr-row { display: flex; gap: 24px; align-items: center; border-top: 2px dashed #cbd5e1; padding-top: 20px; }
  .qr-row img { width: 240px; height: 240px; }
  .scan { font-size: 22px; font-weight: 800; }
  .scan small { display: block; font-size: 13px; color: #64748b; font-weight: 600; margin-top: 4px; word-break: break-all; }
  .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .toolbar { position: sticky; top: 0; background: #f8fafc; padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; }
  .toolbar button { padding: 10px 20px; font-size: 14px; font-weight: 700; background: #1d4ed8; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
</style></head>
<body>
  <div class="toolbar no-print"><button onclick="window.print()">Print poster</button></div>
  <div class="poster">
    <div class="top">
      <img src="${logoSrc}" alt="365 MotorSales" />
      <div class="brand">365 MotorSales<small>Philippines</small></div>
    </div>
    ${coverHtml}
    <div class="title">${escapeHtml(title)}</div>
    ${location ? `<div class="meta">${escapeHtml(location)}</div>` : ""}
    ${priceLine ? `<div class="price">${priceLine}</div>` : ""}
    <div class="qr-row">
      <img src="${qrDataUrl}" alt="Scan to view listing" />
      <div class="scan">Scan to view this listing
        <small>${escapeHtml(url)}</small>
      </div>
    </div>
    <div class="footer">
      <span>365motorsales.com</span>
      <span>Listing ID: ${escapeHtml(listingId)}</span>
    </div>
  </div>
  <script>setTimeout(function(){window.focus();}, 100);</script>
</body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant={triggerVariant}
            size="sm"
            className={className}
            title="QR code & printable poster"
            aria-label="Open listing QR code and printable poster"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant={triggerVariant} className={className}>
            <QrCode className="mr-2 h-4 w-4" /> {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandLogo size={28} /> Share this listing
          </DialogTitle>
          <DialogDescription>
            QR code links to <span className="font-mono break-all">{url}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-border bg-white p-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Listing QR code" className="h-56 w-56" />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center text-sm text-muted-foreground">
                Generating…
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={downloadQr} disabled={!qrDataUrl} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download QR
          </Button>
          <Button onClick={printPoster} disabled={!qrDataUrl}>
            <Printer className="mr-2 h-4 w-4" /> Print poster
          </Button>
          <Button onClick={copyLink} variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Copy link
          </Button>
          <Button onClick={nativeShare} variant="outline">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use the printable poster for car windows, dealership boards, or print ads — every scan
          brings buyers straight to your listing on 365 MotorSales Philippines.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
