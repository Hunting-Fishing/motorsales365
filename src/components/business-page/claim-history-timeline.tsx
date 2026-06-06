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
  FileText,
  Image as ImageIcon,
  FileBadge,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getMyClaimsForBusiness,
  getEvidenceSignedUrl,
  deleteClaimEvidence,
  type EvidenceRow,
} from "@/lib/business-claims.functions";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EvidenceUploader,
  EVIDENCE_TYPE_LABELS,
  formatBytes,
} from "./evidence-uploader";

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

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return FileBadge;
}

function EvidenceReceipt({
  ev,
  canDelete,
  businessId,
}: {
  ev: EvidenceRow;
  canDelete: boolean;
  businessId: string;
}) {
  const getUrl = useServerFn(getEvidenceSignedUrl);
  const doDelete = useServerFn(deleteClaimEvidence);
  const queryClient = useQueryClient();
  const Icon = fileIcon(ev.mime_type);
  const uploaded = new Date(ev.created_at).toLocaleString();

  const handleOpen = async () => {
    try {
      const { url } = await getUrl({ data: { evidenceId: ev.id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open file");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this evidence upload?")) return;
    try {
      await doDelete({ data: { evidenceId: ev.id } });
      queryClient.invalidateQueries({ queryKey: ["my-claim-history", businessId] });
      toast.success("Evidence removed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-background/80 p-2.5 text-xs">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-foreground">{ev.file_name}</span>
          <button
            onClick={handleOpen}
            className="inline-flex shrink-0 items-center gap-0.5 text-primary hover:underline"
          >
            Open <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
            {EVIDENCE_TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
          </Badge>
          <span>{formatBytes(ev.file_size)}</span>
          <span>•</span>
          <span>{uploaded}</span>
          <span className="font-mono opacity-70">#{ev.id.slice(0, 8)}</span>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-red-600 hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineItem({
  claim,
  evidence,
  isLast,
  isLatest,
  businessId,
}: {
  claim: Claim;
  evidence: EvidenceRow[];
  isLast: boolean;
  isLatest: boolean;
  businessId: string;
}) {
  const [expanded, setExpanded] = useState(isLatest);
  const submitted = new Date(claim.created_at).toLocaleString();
  const decided = claim.decided_at ? new Date(claim.decided_at).toLocaleString() : null;
  const canAddEvidence = isLatest && (claim.status === "pending" || claim.status === "rejected");
  const canDeleteEvidence = claim.status === "pending" || claim.status === "rejected";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-border" />}
      </div>

      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(claim)}
          <span className="text-xs text-muted-foreground">{submitted}</span>
          {evidence.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {evidence.length} file{evidence.length === 1 ? "" : "s"}
            </Badge>
          )}
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
          <div className="mt-1 text-xs text-muted-foreground">Decided: {decided}</div>
        )}

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
              <ChevronDown className="h-3 w-3" /> Show details &amp; evidence
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {(claim.evidence_url || claim.notes) && (
              <div className="space-y-1 rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                {claim.evidence_url && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">Evidence link:</span>
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
                    <span className="font-medium text-foreground">Your note:</span>{" "}
                    {claim.notes}
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Last updated:</span>{" "}
                  {new Date(claim.updated_at).toLocaleString()}
                </div>
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidence receipts
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {evidence.length} upload{evidence.length === 1 ? "" : "s"}
                </span>
              </div>
              {evidence.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No evidence uploaded for this submission yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev) => (
                    <EvidenceReceipt
                      key={ev.id}
                      ev={ev}
                      canDelete={canDeleteEvidence}
                      businessId={businessId}
                    />
                  ))}
                </div>
              )}
              {canAddEvidence && (
                <div className="mt-3">
                  <EvidenceUploader claimId={claim.id} businessId={businessId} />
                </div>
              )}
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
  const evidenceByClaim: Record<string, EvidenceRow[]> = data?.evidenceByClaim ?? {};

  if (claims.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Your claim history</h2>
      <div className="space-y-0">
        {claims.map((claim, i) => (
          <TimelineItem
            key={claim.id}
            claim={claim}
            evidence={evidenceByClaim[claim.id] ?? []}
            isLast={i === claims.length - 1}
            isLatest={i === 0}
            businessId={businessId}
          />
        ))}
      </div>
    </Card>
  );
}
