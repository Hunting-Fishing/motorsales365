import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getLead, assignLead, updateLeadStatus, addLeadNote, listOrgMembers } from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageSquare, Truck, Wrench, Building2, User, Mail, Phone, Calendar } from "lucide-react";
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

function LeadDetail() {
  const { id } = Route.useParams();
  const { orgId } = Route.useSearch();
  const qc = useQueryClient();
  const fetchLead = useServerFn(getLead);
  const fetchMembers = useServerFn(listOrgMembers);
  const assignFn = useServerFn(assignLead);
  const statusFn = useServerFn(updateLeadStatus);
  const noteFn = useServerFn(addLeadNote);

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead({ data: { id } }),
  });
  const { data: members } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchMembers({ data: { orgId } }),
  });

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const { lead, activities } = data;
  const Icon = SOURCE_ICONS[lead.source] ?? MessageSquare;

  const reload = () => qc.invalidateQueries({ queryKey: ["lead", id] });

  const onAssign = async (uid: string | null) => {
    try { await assignFn({ data: { id, userId: uid } }); toast.success("Assigned"); reload(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const onStatus = async (s: "new" | "in_progress" | "won" | "lost") => {
    try { await statusFn({ data: { id, status: s } }); toast.success("Status updated"); reload(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const onAddNote = async () => {
    if (note.trim().length < 1) return;
    setSaving(true);
    try { await noteFn({ data: { id, body: note.trim() } }); setNote(""); reload(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Link to="/dashboard/team/leads" search={{ orgId } as any} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{lead.customer_name ?? "—"}</div>
            {lead.customer_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{lead.customer_email}</div>}
            {lead.customer_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{lead.customer_phone}</div>}
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-1">
                {(["new", "in_progress", "won", "lost"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatus(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${lead.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Assigned to</label>
              <select
                value={lead.assigned_to ?? ""}
                onChange={(e) => onAssign(e.target.value || null)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {(members ?? []).map((m: any) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name ?? m.user_id} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {lead.listing_id && (
          <div className="mt-4">
            <Link to="/listing/$id" params={{ id: lead.listing_id }} className="text-sm font-medium text-primary underline">
              View source listing →
            </Link>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Activity</h2>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note (only visible to your team)…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={onAddNote} disabled={saving || note.trim().length < 1}>Add note</Button>
        </div>

        <ul className="mt-5 space-y-3">
          {activities.map((a: any) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{a.actor?.full_name ?? "System"}</span>
                  <span>·</span>
                  <span>{a.kind.replace("_", " ")}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
                {a.body && <p className="mt-0.5 whitespace-pre-wrap">{a.body}</p>}
                {a.kind === "status_changed" && (
                  <p className="mt-0.5 text-muted-foreground">{a.from_value} → {a.to_value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
