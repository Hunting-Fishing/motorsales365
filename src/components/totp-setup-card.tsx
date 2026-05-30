import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, KeyRound, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Factor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: "verified" | "unverified";
  created_at: string;
};

type EnrollState = {
  factorId: string;
  qrSvg: string;
  secret: string;
  uri: string;
} | null;

export function TotpSetupCard() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFactors((data?.totp ?? []) as Factor[]);
  };

  useEffect(() => {
    refresh();
  }, []);

  const verified = factors.find((f) => f.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    // Clean up any half-started unverified factor first
    const stale = factors.find((f) => f.status === "unverified");
    if (stale) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnroll({
      factorId: data.id,
      qrSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
    setCode("");
  };

  const confirmEnroll = async () => {
    if (!enroll) return;
    if (!/^\d{6}$/.test(code)) return toast.error("Enter the 6-digit code.");
    setBusy(true);
    const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({
      factorId: enroll.factorId,
    });
    if (chalErr) {
      setBusy(false);
      return toast.error(chalErr.message);
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: chal.id,
      code,
    });
    setBusy(false);
    if (verifyErr) return toast.error(verifyErr.message);
    toast.success("Two-factor authentication enabled.");
    setEnroll(null);
    setCode("");
    refresh();
  };

  const cancelEnroll = async () => {
    if (enroll) {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    }
    setEnroll(null);
    setCode("");
  };

  const disable = async (factorId: string) => {
    if (!confirm("Disable two-factor authentication on this account?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor authentication disabled.");
    refresh();
  };

  const copySecret = () => {
    if (!enroll) return;
    navigator.clipboard.writeText(enroll.secret).then(
      () => toast.success("Secret copied."),
      () => toast.error("Copy failed."),
    );
  };

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-bold">Security — Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a free authenticator app (Google Authenticator, Authy, 1Password, Microsoft
          Authenticator) for a 6-digit code at sign-in. No SMS needed.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : verified ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-sm font-semibold">Two-factor enabled</div>
              <div className="text-xs text-muted-foreground">
                Enrolled {new Date(verified.created_at).toLocaleDateString()} — codes from
                your authenticator app are required at sign-in.
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => disable(verified.id)} disabled={busy}>
            Disable
          </Button>
        </div>
      ) : enroll ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4" /> Step 1 — Scan this QR code
            </div>
            <div
              className="mx-auto h-44 w-44"
              // Supabase returns an inline SVG string for qr_code
              dangerouslySetInnerHTML={{ __html: enroll.qrSvg }}
            />
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Or enter this secret manually</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {enroll.secret}
                </code>
                <Button size="sm" variant="outline" onClick={copySecret}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="totp-code">Step 2 — Enter the 6-digit code from your app</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="mt-1 tracking-widest"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify & enable"}
            </Button>
            <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
            <span>Two-factor authentication is not enabled. Recommended for sellers and admins.</span>
          </div>
          <Button onClick={startEnroll} disabled={busy}>
            {busy ? "Preparing…" : "Set up authenticator app"}
          </Button>
        </div>
      )}
    </div>
  );
}
