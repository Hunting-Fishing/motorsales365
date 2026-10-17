import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getLead,
  assignLead,
  updateLeadStatus,
  addLeadNote,
  listOrgMembers,
} from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MessageSquare,
  Truck,
  Wrench,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const searchSchema = z.object({ orgId: z.string().uuid() });

export const Route = createFileRoute("/dashboard/team/leads_/$id")({
  validateSearch: searchSchema,
  component: LeadDetail,
});

const SOURCE_ICONS: Record<string, any> = {
  listing_message: MessageSquare,
  business_inquiry: Building2,
  service_inquiry: Wrench,
  tow_request: Truck,
};
const SOURCE_LABEL: Record<string, string> = {
  listing_message: "Listing message",
  business_inquiry: "Business inquiry",
  service_inquiry: "Service inquiry",
  tow_request: "Tow request",
};

const sourceId = z.string().uuid();
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const leadView = z.object({
  lead: z.object({
    id: sourceId,
    organization_id: sourceId,
    assigned_to: sourceId.nullable(),
    source: z.enum(["listing_message", "business_inquiry", "service_inquiry", "tow_request"]),
    status: z.enum(["new", "in_progress", "won", "lost"]),
    subject: z.string().nullable(),
    preview: z.string().nullable(),
    customer_name: z.string().nullable(),
    customer_email: z.string().nullable(),
    customer_phone: z.string().nullable(),
    created_at: z.string(),
    listing_id: sourceId.nullable(),
  }),
  activities: z.array(
    z.object({
      id: sourceId,
      lead_id: sourceId,
      kind: z.string(),
      body: z.string().nullable(),
      from_value: z.string().nullable(),
      to_value: z.string().nullable(),
      created_at: z.string(),
      actor: z.object({ full_name: z.string().nullable() }).nullable(),
    }),
  ),
});
const memberView = z.array(
  z.object({
    user_id: sourceId,
    role: z.enum(["owner", "admin", "member"]),
    profiles: z.object({ id: sourceId, full_name: z.string().nullable() }).nullable(),
  }),
);
const assignmentReceipt = z
  .object({
    ok: z.literal(true),
    assignment: z
      .object({ id: sourceId, organization_id: sourceId, assigned_to: sourceId.nullable() })
      .strict(),
  })
  .strict();
const assignmentUncertain =
  "Assignment outcome could not be confirmed. Review this lead before assigning again.";
function relativeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : formatDistanceToNow(date, { addSuffix: true });
}

function LeadDetail() {
  const { id } = Route.useParams();
  const { orgId } = Route.useSearch();
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking account…</p>;
  if (!user) return <p role="status">Sign in to view this lead.</p>;
  if (!sourceId.safeParse(id).success || !sourceId.safeParse(orgId).success)
    return <p role="alert">This lead is unavailable.</p>;
  return (
    <PrivateLeadDetail
      key={`${user.id}:${id}:${orgId}`}
      id={id}
      orgId={orgId}
      accountId={user.id}
    />
  );
}

function PrivateLeadDetail({
  id,
  orgId,
  accountId,
}: {
  id: string;
  orgId: string;
  accountId: string;
}) {
  const qc = useQueryClient();
  const fetchLead = useServerFn(getLead);
  const fetchMembers = useServerFn(listOrgMembers);
  const assignFn = useServerFn(assignLead);
  const statusFn = useServerFn(updateLeadStatus);
  const noteFn = useServerFn(addLeadNote);

  const lifetime = useId();
  const version = useRef(0);
  const leadKey = ["lead", accountId, id, orgId, lifetime] as const;
  const leadInvalidated = useSyncExternalStore(
    (listener) => qc.getQueryCache().subscribe(listener),
    () => Boolean(qc.getQueryState(leadKey)?.isInvalidated),
    () => false,
  );
  const leadQuery = useQuery({
    queryKey: leadKey,
    queryFn: async ({ signal }) => {
      const parsed = leadView.parse(await fetchLead({ data: { id }, signal }));
      if (
        !sameId(parsed.lead.id, id) ||
        !sameId(parsed.lead.organization_id, orgId) ||
        parsed.activities.some((item) => !sameId(item.lead_id, id)) ||
        new Set(parsed.activities.map((item) => item.id.toLowerCase())).size !==
          parsed.activities.length
      )
        throw new Error("Lead unavailable");
      return { record: parsed, version: ++version.current };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
    refetchOnMount: "always",
  });
  const leadReady = leadQuery.isSuccess && leadQuery.fetchStatus === "idle" && !leadInvalidated;
  const actualOrg = leadReady ? leadQuery.data.record.lead.organization_id : null;
  const membersKey = [
    "org-members",
    accountId,
    id,
    orgId,
    lifetime,
    leadQuery.data?.version,
  ] as const;
  const membersInvalidated = useSyncExternalStore(
    (listener) => qc.getQueryCache().subscribe(listener),
    () => Boolean(qc.getQueryState(membersKey)?.isInvalidated),
    () => false,
  );
  const membersQuery = useQuery({
    queryKey: membersKey,
    enabled: actualOrg !== null,
    queryFn: async ({ signal }) => {
      if (!actualOrg) throw new Error("Members unavailable");
      const members = memberView.parse(await fetchMembers({ data: { orgId: actualOrg }, signal }));
      if (
        new Set(members.map((member) => member.user_id.toLowerCase())).size !== members.length ||
        members.some((member) => member.profiles && !sameId(member.profiles.id, member.user_id))
      )
        throw new Error("Members unavailable");
      return members;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    placeholderData: undefined,
    refetchOnMount: "always",
  });
  const membersReady =
    leadReady &&
    membersQuery.isSuccess &&
    membersQuery.fetchStatus === "idle" &&
    !membersInvalidated;
  const members = membersReady ? membersQuery.data : [];
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"assignment" | "status" | "note" | null>(null);
  const [held, setHeld] = useState(false);
  type Operation = {
    kind: "assignment" | "status" | "note";
    epoch: number;
    version: number;
    lost: boolean;
  };
  const scope = useRef({
    active: false,
    epoch: 0,
    held: false,
    operation: null as Operation | null,
  });
  useLayoutEffect(() => {
    const current = scope.current;
    current.active = true;
    current.epoch += 1;
    if (current.operation?.kind === "assignment") {
      current.held = true;
      setHeld(true);
    }
    current.operation = null;
    setPending(null);
    return () => {
      current.active = false;
      current.epoch += 1;
      if (current.operation) current.operation.lost = true;
    };
  }, []);
  useLayoutEffect(() => {
    const operation = scope.current.operation;
    if (
      operation &&
      (!leadReady ||
        leadQuery.data?.version !== operation.version ||
        (operation.kind === "assignment" && !membersReady))
    ) {
      operation.lost = true;
      if (operation.kind === "assignment") {
        scope.current.held = true;
        setHeld(true);
      }
    }
  }, [leadReady, membersReady, leadQuery.data?.version]);
  function witnessed(assignment: boolean) {
    const primary = qc.getQueryState(leadKey);
    const choices = qc.getQueryState(membersKey);
    return (
      primary?.status === "success" &&
      primary.fetchStatus === "idle" &&
      !primary.isInvalidated &&
      primary.data === leadQuery.data &&
      (!assignment ||
        (choices?.status === "success" &&
          choices.fetchStatus === "idle" &&
          !choices.isInvalidated &&
          choices.data === membersQuery.data))
    );
  }
  function begin(kind: Operation["kind"]): Operation | null {
    const current = scope.current;
    if (
      !current.active ||
      current.operation ||
      current.held ||
      !leadReady ||
      (kind === "assignment" && !membersReady) ||
      !witnessed(kind === "assignment")
    )
      return null;
    const operation = { kind, epoch: current.epoch, version: leadQuery.data.version, lost: false };
    current.operation = operation;
    setPending(kind);
    return operation;
  }
  function current(operation: Operation) {
    if (
      !scope.current.active ||
      scope.current.epoch !== operation.epoch ||
      scope.current.operation !== operation
    )
      return false;
    if (!witnessed(operation.kind === "assignment")) {
      operation.lost = true;
      if (operation.kind === "assignment") {
        scope.current.held = true;
        setHeld(true);
      }
    }
    return !operation.lost;
  }
  function finish(operation: Operation) {
    if (
      scope.current.active &&
      scope.current.epoch === operation.epoch &&
      scope.current.operation === operation
    ) {
      scope.current.operation = null;
      setPending(null);
    }
  }
  const reload = () => {
    void qc.invalidateQueries({ queryKey: ["lead", accountId, id, orgId] });
    void qc.invalidateQueries({ queryKey: ["org-leads", orgId] });
  };

  const onAssign = async (uid: string | null) => {
    if (uid !== null && !members.some((member) => sameId(member.user_id, uid))) {
      toast.error("Choose an available team member.");
      return;
    }
    const operation = begin("assignment");
    if (!operation) return;
    try {
      const raw = await assignFn({
        data: { id, userId: uid, expectedAccountId: accountId, expectedOrgId: orgId },
      });
      if (!current(operation)) return;
      const parsed = assignmentReceipt.safeParse(raw);
      if (
        !parsed.success ||
        !sameId(parsed.data.assignment.id, id) ||
        !sameId(parsed.data.assignment.organization_id, orgId) ||
        (uid === null
          ? parsed.data.assignment.assigned_to !== null
          : parsed.data.assignment.assigned_to === null ||
            !sameId(parsed.data.assignment.assigned_to, uid))
      )
        throw new Error("Unconfirmed assignment");
      finish(operation);
      toast.success("Assignment recorded");
      reload();
    } catch {
      if (current(operation)) {
        scope.current.held = true;
        setHeld(true);
        toast.error(assignmentUncertain);
      }
    } finally {
      finish(operation);
    }
  };
  const onStatus = async (s: "new" | "in_progress" | "won" | "lost") => {
    const operation = begin("status");
    if (!operation) return;
    try {
      await statusFn({ data: { id, status: s } });
      if (!current(operation)) return;
      finish(operation);
      toast.success("Status request completed");
      reload();
    } catch {
      if (current(operation)) toast.error("Could not update this lead. Please try again.");
    } finally {
      finish(operation);
    }
  };
  const onAddNote = async () => {
    if (note.trim().length < 1) return;
    const operation = begin("note");
    if (!operation) return;
    const submitted = note.trim();
    try {
      await noteFn({ data: { id, body: submitted } });
      if (!current(operation)) return;
      setNote((value) => (value.trim() === submitted ? "" : value));
      finish(operation);
      reload();
    } catch {
      if (current(operation)) toast.error("Could not save this note. Please try again.");
    } finally {
      finish(operation);
    }
  };

  const notice = held ? <p role="alert">{assignmentUncertain}</p> : null;
  if (leadQuery.fetchStatus === "paused")
    return (
      <div>
        {notice}
        <p role="status">Lead refresh is paused. Reconnect and retry.</p>
        <Button onClick={() => void leadQuery.refetch()}>Retry lead</Button>
      </div>
    );
  if (leadQuery.isPending || leadQuery.fetchStatus !== "idle")
    return (
      <div>
        {notice}
        <p role="status">Loading lead…</p>
      </div>
    );
  const failedLead = (
    <div>
      {notice}
      <p role="alert">Could not load this lead. Please try again.</p>
      <Button onClick={() => void leadQuery.refetch()}>Retry lead</Button>
    </div>
  );
  if (leadQuery.isError) return failedLead;
  if (leadInvalidated)
    return (
      <div>
        {notice}
        <p role="status">Refresh this lead before making changes.</p>
        <Button onClick={() => void leadQuery.refetch()}>Retry lead</Button>
      </div>
    );
  if (!leadReady) return failedLead;
  const { lead, activities } = leadQuery.data.record;
  const Icon = SOURCE_ICONS[lead.source] ?? MessageSquare;
  const blocked = pending !== null || held;

  return (
    <div className="space-y-4">
      {notice}
      <Link
        to="/dashboard/team/leads"
        search={{ orgId } as any}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inbox
      </Link>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-6 w-6 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold">{lead.subject}</h1>
              <Badge variant="outline">{SOURCE_LABEL[lead.source]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{lead.preview}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {lead.customer_name ?? "—"}
            </div>
            {lead.customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {lead.customer_email}
              </div>
            )}
            {lead.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {lead.customer_phone}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Created {relativeDate(lead.created_at)}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Status
              </label>
              <div className="flex flex-wrap gap-1">
                {(["new", "in_progress", "won", "lost"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatus(s)}
                    disabled={blocked}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${lead.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor={`lead-assignee-${lifetime}`}
                className="mb-1 block text-xs font-semibold text-muted-foreground"
              >
                Assigned to
              </label>
              <select
                id={`lead-assignee-${lifetime}`}
                value={lead.assigned_to ?? ""}
                disabled={blocked || !membersReady}
                onChange={(e) => onAssign(e.target.value || null)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {lead.assigned_to &&
                  !members.some((member) => sameId(member.user_id, lead.assigned_to!)) && (
                    <option value={lead.assigned_to} disabled>
                      Current assignee unavailable
                    </option>
                  )}
                {(members ?? []).map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name ?? m.user_id} ({m.role})
                  </option>
                ))}
              </select>
              {membersQuery.isFetching && <p role="status">Loading team members…</p>}
              {membersQuery.fetchStatus === "paused" && (
                <p role="status">Team member refresh is paused. Reconnect and retry.</p>
              )}
              {!membersQuery.isError &&
                (membersInvalidated || membersQuery.fetchStatus === "paused") && (
                  <Button onClick={() => void membersQuery.refetch()}>Retry team members</Button>
                )}
              {membersQuery.isError && (
                <div>
                  <p role="alert">Could not load team members. Please try again.</p>
                  <Button onClick={() => void membersQuery.refetch()}>Retry team members</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {lead.listing_id && (
          <div className="mt-4">
            <Link
              to="/listing/$id"
              params={{ id: lead.listing_id }}
              className="text-sm font-medium text-primary underline"
            >
              View source listing →
            </Link>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Activity</h2>
        <div className="mt-3 flex gap-2">
          <Textarea
            aria-label="Internal note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note (only visible to your team)…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={onAddNote} disabled={blocked || note.trim().length < 1}>
            Add note
          </Button>
        </div>

        <ul className="mt-5 space-y-3">
          {activities.map((a: any) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {a.actor?.full_name ?? "System"}
                  </span>
                  <span>·</span>
                  <span>{a.kind.replace("_", " ")}</span>
                  <span>·</span>
                  <span>{relativeDate(a.created_at)}</span>
                </div>
                {a.body && <p className="mt-0.5 whitespace-pre-wrap">{a.body}</p>}
                {a.kind === "status_changed" && (
                  <p className="mt-0.5 text-muted-foreground">
                    {a.from_value} → {a.to_value}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
