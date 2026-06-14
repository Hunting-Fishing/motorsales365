import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getMyClaimForBusiness,
  resubmitBusinessClaim,
} from "@/lib/business-claims.functions";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Method = "email" | "phone" | "document" | "social";

export function ClaimStatusSection({ businessId }: { businessId: string }) {
  const { user } = useAuth();
  const fetchClaim = useServerFn(getMyClaimForBusiness);
  const doResubmit = useServerFn(resubmitBusinessClaim);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-claim", businessId],
    queryFn: () => fetchClaim({ data: { businessId } }),
    enabled: !!user,
  });
  const claim = data?.claim;
  const [showDetails, setShowDetails] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [method, setMethod] = useState<Method>("email");
  const [value, setValue] = useState("");
  const [evidence, setEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!claim) return null;

  const decided = !!claim.decided_at;
  const decidedDate = claim.decided_at
    ? new Date(claim.decided_at).toLocaleDateString()
    : null;
  const submittedDate = new Date(claim.created_at).toLocaleDateString();

  const openEdit = () => {
    setMethod((claim.contact_method as Method) ?? "email");
    setValue(claim.contact_value ?? "");
    setEvidence(claim.evidence_url ?? "");
    setNotes(claim.notes ?? "");
    setEditOpen(true);
  };

  const handleResubmit = async (withEdit = false) => {
    setBusy(true);
    try {
      await doResubmit({
        data: {
          claimId: claim.id,
          ...(withEdit
            ? {
                contactMethod: method,
                contactValue:
                  method === "email" || method === "phone" ? value : undefined,
                evidenceUrl:
                  method === "document" || method === "social" ? evidence : undefined,
                notes: notes || undefined,
              }
            : {}),
        },
      });
      toast.success("Claim resubmitted and is now under review.");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-claim", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to resubmit claim");
    } finally {
      setBusy(false);
    }
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      title: "Claim under review",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      nextAction:
        "We'll email you within 1–2 business days with a decision. Make sure your email is verified.",
      cta: null as React.ReactNode,
    },
    approved: {
      icon: CheckCircle2,
      title: "Claim approved",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100",
      nextAction: "You are now the verified owner. Manage your business from your dashboard.",
      cta: (
        <Button asChild size="sm" className="mt-3">
          <Link to="/dashboard/businesses">
            Go to dashboard
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ),
    },
    auto_approved: {
      icon: ShieldCheck,
      title: "Claim auto-approved",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100",
      nextAction: "Your verified contact matched our records. You now own this listing.",
      cta: (
        <Button asChild size="sm" className="mt-3">
          <Link to="/dashboard/businesses">
            Go to dashboard
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ),
    },
    rejected: {
      icon: XCircle,
      title: "Claim not approved",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100",
      nextAction:
        claim.reviewer_notes ||
        "We couldn't verify your ownership with the provided details. You can submit a new claim with stronger evidence.",
      cta: (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleResubmit(false)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {busy ? "Working…" : "Resubmit same claim"}
          </Button>
          <Button size="sm" variant="default" disabled={busy} onClick={openEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit & resubmit
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/support">Contact support</Link>
          </Button>
        </div>
      ),
    },
  } as const;

  const cfg = statusConfig[claim.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <>
      <Card className={`${cfg.bg} ${cfg.border} border p-4 sm:p-5`}>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}
          >
            <Icon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className={`font-display text-base font-semibold ${cfg.color}`}>{cfg.title}</h3>
              <button
                onClick={() => setShowDetails((s) => !s)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showDetails ? (
                  <>
                    Hide details <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Details <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{cfg.nextAction}</p>
            {cfg.cta}

            {showDetails && (
              <div className="mt-3 space-y-1 rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Submitted</span>
                  <span className="font-medium text-foreground">{submittedDate}</span>
                </div>
                {decidedDate && (
                  <div className="flex justify-between">
                    <span>Decided</span>
                    <span className="font-medium text-foreground">{decidedDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-medium text-foreground capitalize">
                    {claim.contact_method}
                  </span>
                </div>
                {claim.contact_value && (
                  <div className="flex justify-between">
                    <span>Value</span>
                    <span className="font-medium text-foreground">{claim.contact_value}</span>
                  </div>
                )}
                {claim.evidence_url && (
                  <div className="flex justify-between">
                    <span>Evidence</span>
                    <a
                      href={claim.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline"
                    >
                      View
                    </a>
                  </div>
                )}
                {claim.reviewer_notes && (
                  <div className="pt-1">
                    <span className="block pb-0.5 font-medium text-foreground">Reviewer note</span>
                    {claim.reviewer_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit & resubmit claim</DialogTitle>
            <DialogDescription>
              Update your verification details and resubmit for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Verification method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Business email</SelectItem>
                  <SelectItem value="phone">Business phone</SelectItem>
                  <SelectItem value="document">Business permit / OR</SelectItem>
                  <SelectItem value="social">Official social page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(method === "email" || method === "phone") && (
              <div>
                <Label>{method === "email" ? "Business email" : "Business phone"}</Label>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={method === "email" ? "owner@business.ph" : "09xx xxx xxxx"}
                />
              </div>
            )}
            {(method === "document" || method === "social") && (
              <div>
                <Label>
                  {method === "document" ? "Evidence URL (permit, OR)" : "Official page URL"}
                </Label>
                <Input
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything our team should know."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => handleResubmit(true)}>
              {busy ? "Resubmitting…" : "Resubmit claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
