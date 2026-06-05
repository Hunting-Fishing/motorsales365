import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/r/$code/poster")({
  component: ReferralPoster,
});

const sb = supabase as any;

function ReferralPoster() {
  const { code } = Route.useParams();
  const [name, setName] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from("staff_referrals")
        .select("full_name, active, referral_code")
        .eq("referral_code", code)
        .maybeSingle();
      if (data) {
        setName((data as any).full_name);
        setActive(Boolean((data as any).active));
      }
      const url = `${siteOrigin()}/r/${code}`;
      const png = await QRCode.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: "H" });
      setQrDataUrl(png);
    })();
  }, [code]);

  return (
    <div className="poster-page min-h-dvh bg-background">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .poster-page { background: white !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Print this page to A4 for in-store display.
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <main className="mx-auto my-8 max-w-[210mm] rounded-xl border border-border bg-white p-10 text-black shadow-sm print:my-0 print:rounded-none print:border-0 print:shadow-none">
        <header className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">365 Motorsales</div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl leading-tight">
            Buy. Sell. Tow. <span className="text-primary">Get an exclusive offer.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-neutral-600">
            Scan with your phone camera to see {name?.split(" ")[0] || "our"} personal offers and
            create an account.
          </p>
        </header>

        <div className="mt-10 flex flex-col items-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR for ${name || code}`}
              className="h-[260px] w-[260px] rounded-md border border-neutral-200 p-2"
            />
          ) : (
            <div className="h-[260px] w-[260px] animate-pulse rounded-md bg-neutral-100" />
          )}
          <div className="mt-6 text-center">
            <div className="font-display text-2xl font-bold">{name || "Referral"}</div>
            <div className="mt-1 text-sm text-neutral-500">
              Code <span className="font-mono">{code}</span>
            </div>
            <div className="mt-1 text-sm text-neutral-500">
              {siteOrigin()}/r/
              {code}
            </div>
            {!active && (
              <div className="mt-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                This code is currently inactive.
              </div>
            )}
          </div>
        </div>

        <footer className="mt-10 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500">
          Offers are subject to terms shown after scan. Credit is recorded on first scan from a
          device for 90 days.
        </footer>
      </main>
    </div>
  );
}
