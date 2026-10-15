import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
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
  getClaimAuditLog,
} from "@/lib/business-claims.functions";
import { EVIDENCE_TYPE_LABELS, formatBytes } from "@/components/business-page/evidence-uploader";

export const Route = createFileRoute("/admin/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [{ title: "Business Claims — Admin" }, { name: "robots", content: "noindex,nofollow" }],
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

const uuid = z.string().uuid();
const nullableText = z.string().nullable();
const timestamp = z.string().datetime({ offset: true });
const evidenceSchema = z
  .object({
    id: uuid,
    claim_id: uuid,
    evidence_type: z.string(),
    file_name: z.string(),
    file_size: z.number().int().nonnegative(),
    mime_type: z.string(),
    storage_path: z.string(),
    notes: nullableText,
    created_at: timestamp,
    uploader_user_id: uuid,
  })
  .strict();
const claimantSchema = z
  .object({
    id: uuid,
    email: nullableText,
    email_confirmed: z.boolean(),
    phone: nullableText,
    phone_confirmed: z.boolean(),
    full_name: nullableText,
    avatar_url: nullableText,
    created_at: timestamp.nullable(),
  })
  .strict();
const claimSchema = z
  .object({
    id: uuid,
    business_id: uuid,
    claimant_user_id: uuid,
    contact_method: z.string(),
    contact_value: nullableText,
    evidence_url: nullableText,
    notes: nullableText,
    status: z.literal("pending"),
    kind: z.enum(["claim", "transfer"]),
    created_at: timestamp,
    businesses: z
      .object({
        name: z.string(),
        slug: nullableText,
        city: nullableText,
        region: nullableText,
        phone: nullableText,
        email: nullableText,
        owner_id: uuid.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();
const listSchema = z
  .object({
    claims: z.array(claimSchema).max(100),
    evidenceByClaim: z.record(z.string(), z.array(evidenceSchema)),
    claimantById: z.record(z.string(), claimantSchema),
  })
  .strict();
type PendingClaim = z.infer<typeof claimSchema>;
type Flight = {
  epoch: object;
  controller: AbortController;
  target: string;
  issued: boolean;
  acknowledged: boolean;
  lostTarget: boolean;
};
const reviewInput = z
  .object({
    id: uuid,
    decision: z.enum(["approve", "reject"]),
    notes: z.string().max(2000).optional(),
  })
  .strict();
const acknowledgement = z.object({ ok: z.literal(true) }).strict();
const unknownOutcome =
  "Review outcome is not confirmed. Refresh and inspect the records before reopening review controls.";
function parseList(raw: unknown) {
  const parsed = listSchema.parse(raw);
  const claims = new Map(parsed.claims.map((claim) => [claim.id, claim]));
  if (claims.size !== parsed.claims.length) throw new Error("Invalid claim snapshot");
  for (const [id, rows] of Object.entries(parsed.evidenceByClaim)) {
    if (!claims.has(id) || rows.some((row) => row.claim_id !== id))
      throw new Error("Invalid evidence scope");
  }
  const claimants = new Set(parsed.claims.map((claim) => claim.claimant_user_id));
  for (const [id, claimant] of Object.entries(parsed.claimantById)) {
    if (!claimants.has(id) || claimant.id !== id) throw new Error("Invalid claimant scope");
  }
  return parsed;
}
const targetKey = (claim: PendingClaim) =>
  JSON.stringify([
    claim.id,
    claim.business_id,
    claim.claimant_user_id,
    claim.kind,
    claim.status,
    claim.businesses?.owner_id ?? null,
  ]);

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
      ev.some((e) => e.evidence_type === "business_license" || e.evidence_type === "utility_bill"),
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

function EvidencePreview({ ev, accountId }: { ev: Evidence; accountId: string }) {
  return (
    <PrivateEvidencePreview key={JSON.stringify([accountId, ev.id, ev.storage_path])} ev={ev} />
  );
}
function PrivateEvidencePreview({ ev }: { ev: Evidence }) {
  const getUrl = useServerFn(getEvidenceSignedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const Icon = fileIcon(ev.mime_type);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setUrl(null);
    setFailed(false);
    void getUrl({ data: { evidenceId: ev.id }, signal: controller.signal })
      .then((result) => {
        if (!alive || controller.signal.aborted) return;
        const parsed = z.object({ url: z.string().url() }).strict().parse(result);
        if (new URL(parsed.url).protocol !== "https:") throw new Error("Invalid preview URL");
        if (alive && !controller.signal.aborted) setUrl(parsed.url);
      })
      .catch(() => {
        if (alive && !controller.signal.aborted) setFailed(true);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [ev.id, getUrl]);
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <Badge variant="secondary">
            {EVIDENCE_TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
          </Badge>
          <p className="text-xs">
            {ev.file_name} · {formatBytes(ev.file_size)}
          </p>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">
              Open full file <ExternalLink aria-hidden="true" className="inline h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      {url && ev.mime_type.startsWith("image/") && (
        <img
          src={url}
          alt={ev.file_name}
          className="mt-2 max-h-64 w-full rounded border object-contain"
        />
      )}
      {url && ev.mime_type === "application/pdf" && (
        <iframe src={url} title={ev.file_name} className="mt-2 h-64 w-full rounded border" />
      )}
      {!url && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {failed ? "Evidence preview unavailable." : "Loading evidence preview…"}
        </p>
      )}
    </div>
  );
}

const auditSchema = z
  .object({
    entries: z
      .array(
        z
          .object({
            id: uuid,
            claim_id: uuid,
            actor_user_id: uuid.nullable(),
            action: z.enum([
              "submitted",
              "resubmitted",
              "approved",
              "auto_approved",
              "rejected",
              "evidence_added",
              "evidence_removed",
              "reviewer_note",
            ]),
            notes: nullableText,
            details: z.record(z.string(), z.unknown()),
            created_at: timestamp,
          })
          .strict(),
      )
      .max(200),
    actorById: z.record(
      z.string(),
      z.object({ id: uuid, name: nullableText, email: nullableText }).strict(),
    ),
  })
  .strict();
function RouteClaimAuditPanel({ accountId, claimId }: { accountId: string; claimId: string }) {
  const fetchLog = useServerFn(getClaimAuditLog);
  const query = useQuery({
    queryKey: ["claim-audit", accountId, claimId],
    queryFn: async ({ signal }) => {
      const parsed = auditSchema.parse(await fetchLog({ data: { claimId }, signal }));
      const ids = new Set(parsed.entries.map((entry) => entry.id));
      if (
        ids.size !== parsed.entries.length ||
        parsed.entries.some((entry) => entry.claim_id !== claimId)
      )
        throw new Error("Invalid audit scope");
      for (const [id, actor] of Object.entries(parsed.actorById))
        if (id !== actor.id) throw new Error("Invalid stored actor");
      return parsed;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    placeholderData: undefined,
  });
  const fresh = query.isFetchedAfterMount && !query.isFetching && !query.isError;
  const snapshot = fresh ? query.data : undefined;
  return (
    <section aria-label="Recorded claim audit" className="rounded-md border p-3">
      <h3 className="text-sm font-semibold">
        Recorded audit snapshot ({snapshot ? snapshot.entries.length : "—"})
      </h3>
      {query.isError ? (
        <p role="alert">Could not load this audit snapshot.</p>
      ) : !snapshot ? (
        <p role="status">Loading audit snapshot…</p>
      ) : snapshot.entries.length === 0 ? (
        <p>No visible audit entries in this snapshot.</p>
      ) : (
        <ol>
          {snapshot.entries.map((entry) => {
            const actor = entry.actor_user_id ? snapshot.actorById[entry.actor_user_id] : null;
            const label = entry.actor_user_id
              ? actor?.name || actor?.email || entry.actor_user_id
              : "Actor not recorded";
            return (
              <li key={entry.id} className="mt-2 text-xs">
                <span>{entry.action.replaceAll("_", " ")}</span>
                {" · "}
                <span>Stored actor label: {label}</span>
                {" · "}
                <time dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString()}
                </time>
                {entry.notes !== null && <p>{entry.notes}</p>}
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Stored entries and labels are not verified original-actor attribution or a complete transfer
        audit.
      </p>
    </section>
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
  const initials = (claimant.full_name ?? claimant.email ?? "?").slice(0, 2).toUpperCase();
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
          <div className="truncate text-sm font-semibold">{claimant.full_name ?? "—"}</div>
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
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700"
            >
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
              Email confirmed
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-[9px] text-amber-700"
            >
              Email not confirmed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{claimant.phone ?? "—"}</span>
          {claimant.phone_confirmed && (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700"
            >
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
              Phone confirmed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-muted-foreground" />
          <span>
            Joined {claimant.created_at ? new Date(claimant.created_at).toLocaleDateString() : "—"}
          </span>
        </div>
        {emailMatchesBusiness && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Claimant email matches business on file
          </div>
        )}
        {submittedMatchesAuth === false && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Submitted {method} doesn't match authenticated
            account
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimsPage() {
  const { user, loading } = useAuth();
  if (loading || !user?.id || !uuid.safeParse(user.id).success)
    return <p role="status">Checking claim review session…</p>;
  return <PrivateClaimsPage key={user.id} accountId={user.id} />;
}
function PrivateClaimsPage({ accountId }: { accountId: string }) {
  const list = useServerFn(listPendingClaims);
  const review = useServerFn(reviewBusinessClaim);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-claims", accountId],
    queryFn: async ({ signal }) => parseList(await list({ signal })),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    placeholderData: undefined,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [checkingManually, setCheckingManually] = useState(false);
  const lifecycle = useRef({ alive: false, epoch: {} });
  const flight = useRef<Flight | null>(null);
  const acknowledgedIds = useRef(new Set<string>());
  const lockedRef = useRef(false);
  const liveClaims = useRef<PendingClaim[]>([]);
  const checking = checkingManually || query.isFetching || !query.isFetchedAfterMount;
  const visible = !checking && !query.isError ? query.data : undefined;
  liveClaims.current = visible?.claims ?? [];
  const pending = flight.current;
  // Monotonic callback fence at every observed render boundary, including
  // checking and target A -> B -> A. Matching values later cannot revive it.
  if (
    pending?.issued &&
    !pending.acknowledged &&
    lifecycle.current.alive &&
    lifecycle.current.epoch === pending.epoch &&
    !liveClaims.current.some((claim) => targetKey(claim) === pending.target)
  ) {
    pending.lostTarget = true;
    lockedRef.current = true;
  }
  const alive = () => lifecycle.current.alive;
  useLayoutEffect(() => {
    const scope = lifecycle.current;
    scope.alive = true;
    scope.epoch = {};
    return () => {
      scope.alive = false;
      scope.epoch = {};
      flight.current?.controller.abort();
      flight.current = null;
      liveClaims.current = [];
    };
  }, []);
  useLayoutEffect(() => {
    if (lockedRef.current && !locked && flight.current?.lostTarget) {
      setLocked(true);
      setNotice(unknownOutcome);
    }
  }, [locked, pending?.lostTarget]);
  async function act(claim: PendingClaim, decision: "approve" | "reject") {
    if (!alive() || flight.current || lockedRef.current || acknowledgedIds.current.has(claim.id))
      return;
    const capturedTarget = targetKey(claim);
    if (!liveClaims.current.some((current) => targetKey(current) === capturedTarget)) return;
    const parsed = reviewInput.safeParse({
      id: claim.id,
      decision,
      notes: notes[claim.id] || undefined,
    });
    if (!parsed.success) {
      toast.error("Check the review request and notes before continuing.");
      return;
    }
    const request: Flight = {
      controller: new AbortController(),
      epoch: lifecycle.current.epoch,
      target: capturedTarget,
      issued: false,
      acknowledged: false,
      lostTarget: false,
    };
    flight.current = request; // One synchronous gate covers both decisions and every claim.
    const live = () =>
      alive() &&
      lifecycle.current.epoch === request.epoch &&
      flight.current === request &&
      !request.controller.signal.aborted;
    const targetCurrent = () =>
      !request.lostTarget &&
      liveClaims.current.some((current) => targetKey(current) === request.target);
    const markUncertain = () => {
      if (!live()) return;
      request.lostTarget = true;
      lockedRef.current = true;
      setLocked(true);
      setNotice(unknownOutcome);
    };
    setBusy(true);
    try {
      if (!live() || !targetCurrent()) return;
      request.issued = true;
      const raw = await review({ data: parsed.data, signal: request.controller.signal });
      if (!live()) return;
      if (!targetCurrent()) {
        markUncertain();
        return;
      }
      if (!acknowledgement.safeParse(raw).success)
        throw new Error("Unconfirmed review acknowledgement");
      request.acknowledged = true;
      acknowledgedIds.current.add(claim.id);
      setAcknowledged(new Set(acknowledgedIds.current));
      const message =
        "Review request acknowledged. Recorded status, ownership and audit were not confirmed.";
      setNotice(message);
      toast.message(message);
      if (live() && targetCurrent())
        void qc.invalidateQueries({ queryKey: ["claim-audit", accountId, claim.id] });
      if (live() && targetCurrent())
        void qc.invalidateQueries({ queryKey: ["admin-claims", accountId] });
    } catch {
      if (live()) {
        if (!targetCurrent()) {
          markUncertain();
          return;
        }
        lockedRef.current = true;
        setLocked(true);
        setNotice(unknownOutcome);
        toast.error(unknownOutcome);
      }
    } finally {
      // Old target/account/epoch completions never clear a newer flight.
      if (live()) {
        flight.current = null;
        setBusy(false);
      }
    }
  }
  const refresh = async () => {
    if (!alive() || flight.current) return;
    const epoch = lifecycle.current.epoch;
    setCheckingManually(true);
    try {
      await query.refetch();
    } finally {
      if (alive() && lifecycle.current.epoch === epoch) setCheckingManually(false);
    }
    // Refresh never clears a decision lock or attests its outcome.
  };

  const evidenceByClaim: Record<string, Evidence[]> =
    (visible?.evidenceByClaim as Record<string, Evidence[]>) ?? {};
  const claimantById: Record<string, Claimant> =
    (visible?.claimantById as Record<string, Claimant>) ?? {};

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Business Claim Requests</h1>
        <p className="text-sm text-muted-foreground">
          Inspect the visible pending snapshot and stored evidence before requesting review.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void refresh();
        }}
        disabled={busy || checking}
      >
        Refresh snapshot
      </Button>
      {notice && <p role={locked ? "alert" : "status"}>{notice}</p>}
      <p className="text-xs text-muted-foreground">
        Requests are not atomic ownership or reviewer-audit confirmation. Refresh does not unlock an
        uncertain request or prove its outcome; inspect the records before leaving and reopening
        review controls.
      </p>
      {query.isError ? (
        <p role="alert">Could not load pending claims.</p>
      ) : checking ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !visible?.claims.length ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No visible pending claims in this snapshot.
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.claims.map((c) => {
            const ev: Evidence[] = evidenceByClaim[c.id] ?? [];
            const completed = CHECKLIST.filter((item) => item.match(ev)).length;
            const claimant = claimantById[c.claimant_user_id];

            return (
              <Card
                key={c.id}
                role="region"
                aria-label={"Claim review for " + (c.businesses?.name ?? c.id)}
                className="space-y-4 p-4"
              >
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
                      {[c.businesses?.city, c.businesses?.region].filter(Boolean).join(", ")}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Submitted {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        c.kind === "transfer"
                          ? "border-orange-300 bg-orange-50 text-orange-800"
                          : "border-blue-200 bg-blue-50 text-blue-800"
                      }
                    >
                      {c.kind === "transfer" ? "Transfer" : "Claim"}
                    </Badge>
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

                {c.kind === "transfer" && c.businesses?.owner_id && (
                  <div className="rounded-md border border-orange-300 bg-orange-50 p-2 text-xs text-orange-900 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100">
                    <span className="font-semibold">Ownership transfer requested.</span> Stored
                    owner: <code>{c.businesses.owner_id}</code>. An approval request does not
                    confirm an owner change or related access.
                  </div>
                )}

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
                        On-file business contact
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{c.businesses?.email ?? "—"}</span>
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
                          <ChecklistItem key={item.key} ok={item.match(ev)} label={item.label} />
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
                        No file evidence visible in this snapshot.
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
                          <EvidencePreview key={e.id} ev={e} accountId={accountId} />
                        ))}
                      </div>
                    )}
                    {c.evidence_url && ev.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Additional link: </span>
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
                        <span className="font-medium">Claimant notes:</span> {c.notes}
                      </div>
                    )}
                  </div>
                </div>

                <RouteClaimAuditPanel accountId={accountId} claimId={c.id} />

                <Textarea
                  aria-label={"Review notes for claim " + c.id}
                  placeholder="Reviewer notes stored with the request"
                  maxLength={2000}
                  disabled={busy || locked || acknowledged.has(c.id)}
                  value={notes[c.id] ?? ""}
                  onChange={(e) => {
                    if (
                      !alive() ||
                      flight.current ||
                      lockedRef.current ||
                      acknowledgedIds.current.has(c.id)
                    )
                      return;
                    setNotes((s) => ({ ...s, [c.id]: e.target.value }));
                  }}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={busy || locked || acknowledged.has(c.id)}
                    onClick={() => {
                      void act(c, "approve");
                    }}
                  >
                    Request approval
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || locked || acknowledged.has(c.id)}
                    onClick={() => {
                      void act(c, "reject");
                    }}
                  >
                    Request rejection
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
