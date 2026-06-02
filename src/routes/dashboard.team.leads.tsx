import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listOrgLeads } from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Inbox, MessageSquare, Truck, Wrench, Building2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const searchSchema = z.object({
  orgId: z.string().uuid(),
  status: z.enum(["all", "new", "in_progress", "won", "lost"]).optional(),
  assigned: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/team/leads")({
  validateSearch: searchSchema,
  component: LeadsInbox,
});

const SOURCE_ICONS: Record<string, any> = {
  listing_message: MessageSquare,
  business_inquiry: Building2,
  service_inquiry: Wrench,
  tow_request: Truck,
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-blue-600" },
  in_progress: { label: "In progress", cls: "bg-amber-500" },
  won: { label: "Won", cls: "bg-emerald-600" },
  lost: { label: "Lost", cls: "bg-rose-600" },
};

function LeadsInbox() {
  const { orgId, status = "all", assigned = "all" } = Route.useSearch();
  const [q, setQ] = useState("");
  const fetchLeads = useServerFn(listOrgLeads);
  const { data: leads, isLoading } = useQuery({
    queryKey: ["org-leads", orgId, status, assigned, q],
    queryFn: () => fetchLeads({ data: { orgId, status, assignedTo: assigned, q: q || undefined } }),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer, subject, or message"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <FilterPill
          label="All"
          to={{ orgId, status: undefined, assigned }}
          active={status === "all"}
        />
        <FilterPill label="New" to={{ orgId, status: "new", assigned }} active={status === "new"} />
        <FilterPill
          label="In progress"
          to={{ orgId, status: "in_progress", assigned }}
          active={status === "in_progress"}
        />
        <FilterPill label="Won" to={{ orgId, status: "won", assigned }} active={status === "won"} />
        <FilterPill
          label="Lost"
          to={{ orgId, status: "lost", assigned }}
          active={status === "lost"}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading leads…</div>
      ) : !leads || leads.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inquiries on listings, businesses, and tow requests assigned to this team will appear
            here.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {leads.map((l: any) => {
            const Icon = SOURCE_ICONS[l.source] ?? MessageSquare;
            const sb = STATUS_BADGE[l.status];
            return (
              <Link
                key={l.id}
                to="/dashboard/team/leads_/$id"
                params={{ id: l.id }}
                search={{ orgId } as any}
                className="flex items-start gap-3 p-4 hover:bg-secondary/50"
              >
                <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold truncate">{l.customer_name ?? "Customer"}</span>
                    <Badge className={sb.cls}>{sb.label}</Badge>
                    {l.assignee ? (
                      <Badge variant="outline" className="text-xs">
                        → {l.assignee.full_name?.split(" ")[0]}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{l.subject}</span>
                    {l.preview ? <> — {l.preview}</> : null}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(l.last_activity_at), { addSuffix: true })}
                </span>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function FilterPill({ label, to, active }: { label: string; to: any; active: boolean }) {
  return (
    <Link
      to="/dashboard/team/leads"
      search={to}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
    >
      {label}
    </Link>
  );
}
