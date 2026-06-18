import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAdHistory } from "@/lib/ad-history.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/advertisements/history")({
  component: AdHistoryPage,
  head: () => ({
    meta: [
      { title: "Advertisement History — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const SOURCE_LABEL: Record<string, string> = {
  advertisement: "Campaign",
  ad_inquiry: "Inquiry",
  promotion: "Promotion",
};

const ACTION_TONE: Record<string, string> = {
  created: "bg-emerald-500 text-white",
  updated: "bg-blue-500 text-white",
  deleted: "bg-destructive text-destructive-foreground",
};

function AdHistoryPage() {
  const { isAdmin } = useAuth();
  const [source, setSource] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const fn = useServerFn(listAdHistory);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ad-history", source, action],
    queryFn: () =>
      fn({
        data: {
          source: source === "all" ? undefined : (source as any),
          action: action === "all" ? undefined : (action as any),
        },
      }),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Admin role required to view the legal history log.
      </div>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <History className="h-6 w-6" /> Advertisement History
        </h1>
        <p className="text-sm text-muted-foreground">
          Append-only legal record of every advertisement, inquiry and promotion change.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="advertisement">Campaigns</SelectItem>
            <SelectItem value="ad_inquiry">Inquiries</SelectItem>
            <SelectItem value="promotion">Promotions</SelectItem>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading history…</div>
      ) : error ? (
        <div className="text-sm text-destructive">Failed to load: {String((error as any).message ?? error)}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border p-6 text-sm text-muted-foreground">No history yet.</div>
      ) : (
        <div className="divide-y rounded-md border">
          {entries.map((e: any) => {
            const open = openId === e.id;
            const title =
              e.snapshot?.title ||
              e.snapshot?.code ||
              e.snapshot?.contact_name ||
              e.source_id ||
              "(unknown)";
            return (
              <div key={e.id} className="p-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                  <Badge variant="outline">{SOURCE_LABEL[e.source] ?? e.source}</Badge>
                  <Badge className={ACTION_TONE[e.action] ?? ""}>{e.action}</Badge>
                  <span className="flex-1 truncate text-sm">{title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(e.changed_at)}
                  </span>
                </button>
                {open && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        Snapshot
                      </div>
                      <pre className="max-h-80 overflow-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(e.snapshot, null, 2)}
                      </pre>
                    </div>
                    {e.previous && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                          Previous
                        </div>
                        <pre className="max-h-80 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(e.previous, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
