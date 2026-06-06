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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyClaimForBusiness } from "@/lib/business-claims.functions";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export function ClaimStatusSection({ businessId }: { businessId: string }) {
  const { user } = useAuth();
  const fetchClaim = useServerFn(getMyClaimForBusiness);
  const { data } = useQuery({
    queryKey: ["my-claim", businessId],
    queryFn: () => fetchClaim({ data: { businessId } }),
    enabled: !!user,
  });
  const claim = data?.claim;
  const [showDetails, setShowDetails] = useState(false);

  if (!claim) return null;

  const decided = !!claim.decided_at;
  const decidedDate = claim.decided_at
    ? new Date(claim.decided_at).toLocaleDateString()
    : null;
  const submittedDate = new Date(claim.created_at).toLocaleDateString();

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
  );
}
