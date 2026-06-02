import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

const PAGE_SIZE = 50;

type Row = {
  id: string;
  actor_id: string;
  target_user_id: string;
  action: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  role_granted: "Role granted",
  role_revoked: "Role revoked",
  verification_changed: "Verification changed",
  seller_type_changed: "Seller type changed",
};

function fmt(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    setPage(0);
  }, [actionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") q = q.eq("action", actionFilter);

      // Optional search by target user id (exact uuid) – names not searchable here without a join
      if (search) {
        if (/^[0-9a-f-]{8,}$/i.test(search)) {
          q = q.or(`target_user_id.eq.${search},actor_id.eq.${search}`);
        }
      }

      const from = page * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      const list = (data ?? []) as Row[];
      setRows(list);
      setTotal(count ?? 0);

      // Resolve actor + target names
      const ids = Array.from(new Set(list.flatMap((r) => [r.actor_id, r.target_user_id])));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = p.full_name ?? p.id.slice(0, 8);
        });
        setNames((prev) => ({ ...prev, ...map }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const nameOf = (id: string) => names[id] ?? id.slice(0, 8) + "…";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Admin audit log</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Every role grant/revoke and verification status change made through the admin panel is
        recorded here with a timestamp and actor.
      </p>

      <div className="mb-3 grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user UUID (actor or target)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="role_granted">Role granted</SelectItem>
            <SelectItem value="role_revoked">Role revoked</SelectItem>
            <SelectItem value="verification_changed">Verification changed</SelectItem>
            <SelectItem value="seller_type_changed">Seller type changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-2 text-xs text-muted-foreground">
        {loading ? "Loading…" : `${total} entries`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Change</th>
              <th className="px-3 py-2 text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No audit entries match.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {fmt(r.created_at)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{ACTION_LABEL[r.action] ?? r.action}</Badge>
                </td>
                <td className="px-3 py-2">{nameOf(r.target_user_id)}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{r.field}:</span>{" "}
                  <span className="line-through text-muted-foreground">{r.old_value ?? "—"}</span>
                  {" → "}
                  <span className="font-medium">{r.new_value ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-xs">{nameOf(r.actor_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
