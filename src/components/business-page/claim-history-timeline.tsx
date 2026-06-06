import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyClaimsForBusiness } from "@/lib/business-claims.functions";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

type Claim = {
  id: string;
  status: string;
  reviewer_notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  contact_method: string;
  contact_value: string | null;
  evidence_url: string | null;
  notes: string | null;
};

function statusBadge(claim: Claim) {
  switch (claim.status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          <Clock className="mr-1 h-3 w-3" />
          Under review
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    case "auto_approved":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Auto-approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{claim.status}</Badge>;
  }
}

function TimelineItem({ claim, isLast }: { claim: Claim; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const submitted = new Date(claim.created_at).toLocaleString();
  const decided = claim.decided_at ? new Date(claim.decided_at).toLocaleString() : null;

  return (
    <div className="flex gap-4">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(claim)}
          <span className="text-xs text-muted-foreground">{submitted}</span>
        </div>

        <div className="mt-1 text-sm font-medium capitalize">
          {claim.contact_method} verification
        </div>

        {claim.contact_value && (
          <div className="text-xs text-muted-foreground">{claim.contact_value}</div>
        )}

        {claim.reviewer_notes && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <span className="font-semibold">Reviewer note:</span> {claim.reviewer_notes}
          </div>
        )}

        {decided && (
          <div className="mt-1 text-xs text-muted-foreground">
            Decided: {decided}
          </div>
        )}

        {(claim.evidence_url || claim.notes) && (
          <button
            onClick={() => setExpanded((s) => !s)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show details
              </>
            )}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1 rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            {claim.evidence_url && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">Evidence:</span>
                <a
                  href={claim.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary underline"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {claim.notes && (
              <div>
                <span className="font-medium text-foreground">Your note:</span> {claim.notes}
              </div>
            )}
            <div>
              <span className="font-medium text-foreground">Last updated:</span>{" "}
              {new Date(claim.updated_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClaimHistoryTimeline({ businessId }: { businessId: string }) {
  const { user } = useAuth();
  const fetchClaims = useServerFn(getMyClaimsForBusiness);
  const { data } = useQuery({
    queryKey: ["my-claim-history", businessId],
    queryFn: () => fetchClaims({ data: { businessId } }),
    enabled: !!user,
  });

  const claims: Claim[] = data?.claims ?? [];

  if (claims.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Your claim history</h2>
      <div className="space-y-0">
        {claims.map((claim, i) => (
          <TimelineItem key={claim.id} claim={claim} isLast={i === claims.length - 1} />
        ))}
      </div>
    </Card>
  );
}
