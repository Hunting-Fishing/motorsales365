import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, Printer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/my-qr")({
  component: MyQrPage,
  head: () => ({
    meta: [
      { title: "My QR Code — 365 Motor Sales" },
      { name: "description", content: "Your personal QR code for in-person referrals, redemptions, and verification." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const sb = supabase as any;

function MyQrPage() {
  const { user, loading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    (async () => {
      const { data } = await sb
        .from("staff_referrals")
        .select("referral_code, full_name, active")
        .eq("staff_user_id", user.id)
        .maybeSingle();
      if (data) {
        setCode(data.referral_code);
        setName(data.full_name);
        setActive(Boolean(data.active));
        const url = `${window.location.origin}/r/${data.referral_code}`;
        const png = await QRCode.toDataURL(url, {
          width: 900,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        setQrDataUrl(png);
      }
      setFetching(false);
    })();
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to view your QR code</h1>
        <p className="mt-2 text-muted-foreground">
          Your personal referral QR is only available to your account.
        </p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No referral code yet</h1>
        <p className="mt-2 text-muted-foreground">
          You don't have a staff referral code assigned to your account.
        </p>
      </div>
    );
  }

  const link = `${typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com"}/r/${code}`;

  return (
    <div className="container mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Your referral
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">{name || "My QR Code"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Show or share this code. Every scan and signup is credited to you.
        </p>
        {!active && (
          <div className="mt-3 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            This code is currently inactive.
          </div>
        )}
      </div>

      <Card className="flex flex-col items-center gap-5 p-6">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Scannable QR for ${name || code}`}
            className="h-[320px] w-[320px] rounded-md border border-border bg-white object-contain p-3 sm:h-[420px] sm:w-[420px]"
          />
        ) : (
          <div className="h-[320px] w-[320px] animate-pulse rounded-md bg-muted sm:h-[420px] sm:w-[420px]" />
        )}

        <div className="w-full text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Code</div>
          <div className="font-mono text-sm">{code}</div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block break-all text-xs text-primary hover:underline"
          >
            {link}
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link copied");
            }}
          >
            <Copy className="mr-1 h-4 w-4" /> Copy link
          </Button>
          {qrDataUrl && (
            <a href={qrDataUrl} download={`${code}-qr.png`}>
              <Button size="sm" variant="outline">
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
            </a>
          )}
          <Link to="/r/$code/poster" params={{ code }}>
            <Button size="sm" variant="outline">
              <Printer className="mr-1 h-4 w-4" /> Print poster
            </Button>
          </Link>
          <Link to="/dashboard/share-kit">
            <Button size="sm">
              Open share kit
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
