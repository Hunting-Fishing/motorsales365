import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { siteOrigin } from "@/lib/site-config";
import { computeQuietZoneModules } from "@/lib/qr-quiet-zone";
import { ZoomableQr } from "@/components/qr/zoomable-qr";
import { toast } from "sonner";

export const Route = createFileRoute("/r/$code/qr")({
  component: ReferralQrFullscreen,
  head: ({ params }) => ({
    meta: [
      { title: `Scan to open — ${params.code} · 365 Motor Sales` },
      {
        name: "description",
        content:
          "Scan this QR with your phone camera to reach 365 Motor Sales through this referral.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const sb = supabase as any;

function ReferralQrFullscreen() {
  const { code } = Route.useParams();
  const [name, setName] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const link = `${siteOrigin()}/r/${code}?src=qr`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("staff_referrals")
        .select("full_name, active")
        .eq("referral_code", code)
        .maybeSingle();
      if (!cancelled && data) {
        setName((data as any).full_name ?? null);
        setActive(Boolean((data as any).active));
      }
      const png = await QRCode.toDataURL(link, {
        width: 1024,
        margin: computeQuietZoneModules(1024, "H"),
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });
      if (!cancelled) setQrDataUrl(png);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, link]);

  const download = async () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${code}-qr.png`;
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            365 Motor Sales
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold">Scan to open</h1>
          {name ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Shared by <span className="font-medium text-foreground">{name}</span>
            </p>
          ) : null}
          {!active ? (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
              This referral is no longer active.
            </p>
          ) : null}
        </div>

        <div
          className="w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border"
          role="img"
          aria-label={`QR code for ${name ?? code}`}
        >
          <ZoomableQr ariaLabel="Pinch or double-tap the QR to zoom in for scanning">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${link}`}
                draggable={false}
                className="mx-auto block h-auto w-full max-w-[360px]"
              />
            ) : (
              <div className="mx-auto aspect-square w-full max-w-[360px] animate-pulse rounded-md bg-muted" />
            )}
          </ZoomableQr>
          <div className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            {code}
          </div>
        </div>

        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Pinch, double-tap, or use the +/− buttons to zoom. Or tap "Open link" below.
        </p>


        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          <a href={link} target="_blank" rel="noreferrer" className="sm:col-span-1">
            <Button className="w-full">
              <ExternalLink className="mr-1 h-4 w-4" /> Open link
            </Button>
          </a>
          <Button variant="outline" onClick={copyLink} className="sm:col-span-1">
            Copy link
          </Button>
          <Button variant="outline" onClick={download} disabled={!qrDataUrl} className="sm:col-span-1">
            <Download className="mr-1 h-4 w-4" /> PNG
          </Button>
        </div>
      </main>
    </div>
  );
}
