import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  verifyReferralCode,
  type VerifyReferralReport,
} from "@/lib/admin-verify-referral.functions";
import { formatDate } from "@/lib/format";

interface Props {
  referralCode: string | null;
  onClose: () => void;
}

/**
 * Admin diagnostic dialog: runs the referral-code verification server fn
 * and renders a checklist of pass/fail rules plus recent scans + signups
 * so admins can confirm QR → referred-by → signup_intent wiring end-to-end.
 */
export function VerifyReferralDialog({ referralCode, onClose }: Props) {
  const runVerify = useServerFn(verifyReferralCode);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<VerifyReferralReport | null>(null);

  useEffect(() => {
    if (!referralCode) return;
    setReport(null);
    setLoading(true);
    (runVerify as any)({ data: { referralCode } })
      .then((r: VerifyReferralReport) => setReport(r))
      .catch((e: any) => toast.error(e?.message ?? "Verification failed"))
      .finally(() => setLoading(false));
  }, [referralCode, runVerify]);

  const rerun = () => {
    if (!referralCode) return;
    setLoading(true);
    (runVerify as any)({ data: { referralCode } })
      .then((r: VerifyReferralReport) => setReport(r))
      .catch((e: any) => toast.error(e?.message ?? "Verification failed"))
      .finally(() => setLoading(false));
  };

  const passCount = report?.checks.filter((c) => c.pass).length ?? 0;
  const totalChecks = report?.checks.length ?? 0;
  const allPass = report != null && passCount === totalChecks;

  return (
    <Dialog open={!!referralCode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify referral wiring</DialogTitle>
          <DialogDescription>
            End-to-end check for code{" "}
            <span className="font-mono">{referralCode}</span> — QR scan
            recording, credit gating, referred-by link, signup source, and
            intent capture.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Running checks…
          </div>
        )}

        {!loading && report && (
          <div className="space-y-4">
            <div
              className={`rounded-lg border p-3 text-sm ${
                allPass
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <strong>
                {passCount} / {totalChecks} checks passing
              </strong>
              {report.staff ? (
                <span className="ml-2 text-muted-foreground">
                  · Owner: {report.staff.full_name ?? report.staff.email ?? "—"}
                </span>
              ) : null}
              <span className="ml-2 text-muted-foreground">
                · {report.scans.total} scans · {report.signups.total} attributed
                signups
              </span>
            </div>

            <ul className="space-y-1.5">
              {report.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-sm"
                >
                  {c.pass ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent scans
              </div>
              {report.scans.recent.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No QR scans recorded yet. Scan the poster or visit /r/
                  {report.referral_code} to generate one.
                </div>
              ) : (
                <div className="rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">When</th>
                        <th className="px-2 py-1.5 font-medium">Device</th>
                        <th className="px-2 py-1.5 font-medium">Country</th>
                        <th className="px-2 py-1.5 font-medium">Visitor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.scans.recent.map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1.5">{formatDate(s.scanned_at)}</td>
                          <td className="px-2 py-1.5">{s.device_type ?? "—"}</td>
                          <td className="px-2 py-1.5">{s.country ?? "—"}</td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                            {s.visitor_id?.slice(0, 12) ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attributed signups
              </div>
              {report.signups.recent.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No signups attributed to this code yet.
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">User</th>
                        <th className="px-2 py-1.5 font-medium">Date</th>
                        <th className="px-2 py-1.5 font-medium">Source</th>
                        <th className="px-2 py-1.5 font-medium">Intent</th>
                        <th className="px-2 py-1.5 font-medium">Credited</th>
                        <th className="px-2 py-1.5 font-medium">Staff link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.signups.recent.map((s) => (
                        <tr key={s.user_id} className="border-t border-border">
                          <td className="px-2 py-1.5">{s.full_name ?? "—"}</td>
                          <td className="px-2 py-1.5">
                            {s.signup_date ? formatDate(s.signup_date) : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                                s.from_qr
                                  ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300"
                                  : "border-muted bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {s.signup_source ?? "—"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            {s.signup_intent ?? (
                              <span className="text-muted-foreground">unset</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {s.credited_ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {s.referred_by_ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={rerun}>
                Re-run
              </Button>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
