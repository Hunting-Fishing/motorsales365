import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, X, Play, Undo2, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPHP, formatDate } from "@/lib/format";
import {
  adminGetPaymentDetail,
  adminClaimPaymentReview,
  adminReleasePaymentReview,
  adminApprovePayment,
  adminRejectPayment,
  type ReviewState,
} from "@/lib/payments-manual.functions";

const STATE_LABEL: Record<string, string> = {
  awaiting_review: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  not_applicable: "Auto",
};

const STATE_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  awaiting_review: "secondary",
  in_review: "default",
  approved: "default",
  rejected: "destructive",
  not_applicable: "outline",
};

export function PaymentReviewDrawer({
  paymentId,
  open,
  onClose,
  onChanged,
}: {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const get = useServerFn(adminGetPaymentDetail);
  const claim = useServerFn(adminClaimPaymentReview);
  const release = useServerFn(adminReleasePaymentReview);
  const approve = useServerFn(adminApprovePayment);
  const reject = useServerFn(adminRejectPayment);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      setDetail(await get({ data: { id: paymentId } }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && paymentId) {
      setNote("");
      setReason("");
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentId]);

  const run = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const p = detail?.payment;
  const rs: ReviewState | undefined = p?.review_state;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Payment review</SheetTitle>
        </SheetHeader>

        {loading || !detail ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{p.invoice_number ?? p.id.slice(0, 8)}</span>
                <Badge variant={STATE_VARIANT[rs!] ?? "outline"}>{STATE_LABEL[rs!] ?? rs}</Badge>
                <Badge variant="outline">{p.kind}</Badge>
                {p.method && <Badge>{p.method}</Badge>}
              </div>
              <div className="text-2xl font-semibold">{formatPHP(Number(p.amount_php))}</div>
              <div className="text-sm text-muted-foreground">
                {detail.profile?.business_name || detail.profile?.full_name || "Unknown buyer"}
              </div>
              <div className="text-xs text-muted-foreground">
                Submitted {formatDate(p.created_at)}
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <Row label="Reference" value={p.reference} />
              <Row label="Buyer notes" value={p.notes} />
              <Row label="Proof uploaded" value={p.proof_uploaded_at ? formatDate(p.proof_uploaded_at) : null} />
              {detail.signed_proof_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={detail.signed_proof_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" /> Open proof
                  </a>
                </Button>
              )}
            </div>

            {(rs === "approved" || rs === "rejected") && (
              <>
                <Separator />
                <div className="space-y-1 text-sm">
                  <Row label="Approved at" value={p.approved_at ? formatDate(p.approved_at) : null} />
                  <Row label="Rejected at" value={p.rejected_at ? formatDate(p.rejected_at) : null} />
                  <Row label="Rejection reason" value={p.rejection_reason} />
                  <Row label="Reviewer note" value={p.review_notes} />
                </div>
              </>
            )}

            <Separator />

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Timeline
              </div>
              {detail.events.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events yet.</div>
              ) : (
                <ol className="space-y-2 border-l pl-4 text-sm">
                  {detail.events.map((e: any) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {STATE_LABEL[e.from_state] ?? e.from_state ?? "—"} →{" "}
                          {STATE_LABEL[e.to_state] ?? e.to_state}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(e.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {e.actor?.full_name || e.actor?.business_name || "System"}
                      </div>
                      {e.note && <div className="mt-1 text-xs">{e.note}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              {rs === "awaiting_review" && (
                <>
                  <Label className="text-xs">Internal note (optional)</Label>
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(() => claim({ data: { id: p.id, note: note || undefined } }), "Claimed for review")
                    }
                  >
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                    Start review
                  </Button>
                </>
              )}

              {rs === "in_review" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Approval note (optional)</Label>
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Rejection reason (required to reject, min 5 chars)</Label>
                    <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => approve({ data: { id: p.id, notes: note || undefined } }),
                          "Payment approved",
                        )
                      }
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy || reason.trim().length < 5}
                      onClick={() =>
                        run(() => reject({ data: { id: p.id, reason } }), "Payment rejected")
                      }
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => release({ data: { id: p.id, note: note || undefined } }),
                          "Released to queue",
                        )
                      }
                    >
                      <Undo2 className="mr-1 h-4 w-4" /> Release
                    </Button>
                  </div>
                </div>
              )}

              {(rs === "approved" || rs === "rejected" || rs === "not_applicable") && (
                <div className="text-sm text-muted-foreground">
                  This payment is in a terminal state. Use the refund flow for chargebacks.
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words">{String(value)}</div>
    </div>
  );
}
