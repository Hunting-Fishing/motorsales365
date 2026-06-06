import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  FileText,
  Image as ImageIcon,
  FileBadge,
  ExternalLink,
  Mail,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  listPendingClaims,
  reviewBusinessClaim,
  getEvidenceSignedUrl,
} from "@/lib/business-claims.functions";
import {
  EVIDENCE_TYPE_LABELS,
  formatBytes,
} from "@/components/business-page/evidence-uploader";
import { ClaimAuditPanel } from "@/components/business-page/claim-audit-panel";

export const Route = createFileRoute("/admin/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      { title: "Business Claims — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Evidence = {
  id: string;
  claim_id: string;
  evidence_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
  uploader_user_id: string;
};

type Claimant = {
  id: string;
  email: string | null;
  email_confirmed: boolean;
  phone: string | null;
  phone_confirmed: boolean;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const CHECKLIST: Array<{
  key: string;
  label: string;
  match: (ev: Evidence[]) => boolean;
}> = [
  {
    key: "ownership_proof",
    label: "Ownership proof (Facebook / Google Business)",
    match: (ev) =>
      ev.some(
        (e) =>
          e.evidence_type === "facebook_ownership" ||
          e.evidence_type === "google_business" ||
          e.evidence_type === "website_proof",
      ),
  },
  {
    key: "business_doc",
    label: "Business document (license, permit, or utility bill)",
    match: (ev) =>
      ev.some(
        (e) =>
          e.evidence_type === "business_license" ||
          e.evidence_type === "utility_bill",
      ),
  },
  {
    key: "id_doc",
    label: "Government-issued ID of claimant",
    match: (ev) => ev.some((e) => e.evidence_type === "id_document"),
  },
  {
    key: "has_image",
    label: "At least one image / screenshot",
    match: (ev) => ev.some((e) => e.mime_type.startsWith("image/")),
  },
];

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return FileBadge;
}

function EvidencePreview({ ev }: { ev: Evidence }) {
  const getUrl = useServerFn(getEvidenceSignedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const Icon = fileIcon(ev.mime_type);
  const isImage = ev.mime_type.startsWith("image/");
  const isPdf = ev.mime_type === "application/pdf";

  useEffect(() => {
    let alive = true;
    getUrl({ data: { evidenceId: ev.id } })
      .then((r) => alive && setUrl(r.url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ev.id, getUrl]);

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {EVIDENCE_TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatBytes(ev.file_size)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(ev.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs font-medium">{ev.file_name}</div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
            >
              Open full file <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {url && isImage && (
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
          <img
            src={url}
            alt={ev.file_name}
            className="max-h-64 w-full rounded border border-border object-contain"
          />
        </a>
      )}
      {url && isPdf && (
        <iframe
          src={url}
          title={ev.file_name}
          className="mt-2 h-64 w-full rounded border border-border"
        />
      )}
      {!url && (
        <div className="mt-2 h-24 animate-pulse rounded border border-dashed border-border bg-muted/30" />
      )}
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : Circle;
  return (
    <li className="flex items-center gap-2 text-xs">
      <Icon className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-muted-foreground"}`} />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function ClaimantPanel({
  claimant,
  business,
  contactValue,
  method,
}: {
  claimant: Claimant | undefined;
  business: { email?: string | null; phone?: string | null } | null | undefined;
  contactValue: string | null;
  method: string;
}) {
  if (!claimant) {
    return <div className="text-xs text-muted-foreground">Unknown claimant</div>;
  }
  const initials =
    (claimant.full_name ?? claimant.email ?? "?").slice(0, 2).toUpperCase();
  const emailMatchesBusiness =
    !!business?.email &&
    !!claimant.email &&
    claimant.email.trim().toLowerCase() === business.email.trim().toLowerCase();
  const submittedMatchesAuth =
    method === "email"
      ? contactValue?.trim().toLowerCase() === (claimant.email ?? "").trim().toLowerCase()
      : method === "phone"
      ? (contactValue ?? "").replace(/\D+/g, "").slice(-10) ===
        (claimant.phone ?? "").replace(/\D+/g, "").slice(-10)
      : null;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          {claimant.avatar_url && <AvatarImage src={claimant.avatar_url} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {claimant.full_name ?? "—"}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {claimant.id.slice(0, 8)}…
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{claimant.email ?? "—"}</span>
          {claimant.email_confirmed ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
              verified
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[9px] text-amber-700">
              unverified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{claimant.phone ?? "—"}</span>
          {claimant.phone_confirmed && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
              verified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-muted-foreground" />
          <span>
            Joined{" "}
            {claimant.created_at
              ? new Date(claimant.created_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
        {emailMatchesBusiness && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Claimant email matches business
            on file
          </div>
        )}
        {submittedMatchesAuth === false && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Submitted {method} doesn't
            match authenticated account
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimsPage() {
  const list = useServerFn(listPendingClaims);
  const review = useServerFn(reviewBusinessClaim);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: () => list(),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, decision: "approve" | "reject") {
    setBusy(id + decision);
    try {
      await review({ data: { id, decision, notes: notes[id] || undefined } });
      toast.success(`Claim ${decision}d`);
      qc.invalidateQueries({ queryKey: ["admin-claims"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  const evidenceByClaim: Record<string, Evidence[]> =
    (data?.evidenceByClaim as Record<string, Evidence[]>) ?? {};
  const claimantById: Record<string, Claimant> =
    (data?.claimantById as Record<string, Claimant>) ?? {};

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Business Claim Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review each claim with its evidence, uploader identity, and a
          completeness checklist before deciding.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data?.claims?.length ? (
        <Card className="p-6 text-sm text-muted-foreground">No pending claims.</Card>
      ) : (
        <div className="space-y-4">
          {data.claims.map((c: any) => {
            const ev: Evidence[] = evidenceByClaim[c.id] ?? [];
            const completed = CHECKLIST.filter((item) => item.match(ev)).length;
            const claimant = claimantById[c.claimant_user_id];

            return (
              <Card key={c.id} className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: c.businesses?.slug ?? "" }}
                      className="font-semibold underline"
                    >
                      {c.businesses?.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {[c.businesses?.city, c.businesses?.region]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Submitted {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="capitalize">
                      {c.contact_method}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        completed === CHECKLIST.length
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : completed === 0
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      Checklist {completed}/{CHECKLIST.length}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                  <div className="space-y-3">
                    <ClaimantPanel
                      claimant={claimant}
                      business={c.businesses}
                      contactValue={c.contact_value}
                      method={c.contact_method}
                    />
                    <div className="rounded-md border border-border p-3 text-xs">
                      <div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
                        On-file (Google import)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">
                          {c.businesses?.email ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{c.businesses?.phone ?? "—"}</span>
                      </div>
                      <div className="mt-2 border-t border-border pt-2">
                        <div className="text-muted-foreground">Claimed value</div>
                        <div className="font-medium">{c.contact_value || "—"}</div>
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Evidence checklist
                      </div>
                      <ul className="space-y-1">
                        {CHECKLIST.map((item) => (
                          <ChecklistItem
                            key={item.key}
                            ok={item.match(ev)}
                            label={item.label}
                          />
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Evidence ({ev.length})
                      </div>
                    </div>
                    {ev.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                        No file evidence uploaded.
                        {c.evidence_url && (
                          <div className="mt-2">
                            Submitted link:{" "}
                            <a
                              href={c.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-primary underline"
                            >
                              {c.evidence_url}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ev.map((e) => (
                          <EvidencePreview key={e.id} ev={e} />
                        ))}
                      </div>
                    )}
                    {c.evidence_url && ev.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          Additional link:{" "}
                        </span>
                        <a
                          href={c.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-primary underline"
                        >
                          {c.evidence_url}
                        </a>
                      </div>
                    )}
                    {c.notes && (
                      <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                        <span className="font-medium">Claimant notes:</span>{" "}
                        {c.notes}
                      </div>
                    )}
                  </div>
                </div>

                <Textarea
                  placeholder="Internal review notes (sent to claimant on rejection)"
                  value={notes[c.id] ?? ""}
                  onChange={(e) =>
                    setNotes((s) => ({ ...s, [c.id]: e.target.value }))
                  }
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={busy === c.id + "approve"}
                    onClick={() => act(c.id, "approve")}
                  >
                    Approve & transfer
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy === c.id + "reject"}
                    onClick={() => act(c.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
