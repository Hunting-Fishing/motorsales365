import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/inquiries")({
  head: () => ({ meta: [{ title: "Service inquiries — Admin" }] }),
  component: AdminInquiriesPage,
});

type Inquiry = {
  id: string;
  inquiry_type: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  vehicle_summary: string | null;
  status: string;
  listing_id: string | null;
  source_url: string | null;
  internal_notes: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  financing: "Financing",
  insurance: "Insurance",
  or_cr: "OR/CR",
  title_transfer: "Title transfer",
  inspection: "Inspection",
  towing: "Towing",
  other: "Other",
};

const STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;

function AdminInquiriesPage() {
  const { user, isStaff } = useAuth();
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    let query = supabase
      .from("service_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (typeFilter !== "all") query = query.eq("inquiry_type", typeFilter as any);
    if (statusFilter === "active") {
      query = query.in("status", ["new", "contacted", "quoted"] as any);
    } else if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, typeFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.contact_name?.toLowerCase().includes(needle) ||
        r.email?.toLowerCase().includes(needle) ||
        r.phone?.toLowerCase().includes(needle) ||
        r.vehicle_summary?.toLowerCase().includes(needle) ||
        r.message?.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("service_inquiries")
      .update({ status } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  }

  async function saveNotes() {
    if (!editing) return;
    const { error } = await supabase
      .from("service_inquiries")
      .update({ internal_notes: notes } as any)
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    setEditing(null);
    load();
  }

  if (!isStaff || !user) {
    return <div className="p-8 text-sm text-muted-foreground">Staff access required.</div>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Inbox className="h-5 w-5" /> Service inquiries
          </h1>
          <p className="text-sm text-muted-foreground">
            Lead-gen inbox: financing, insurance, OR/CR, title transfer, inspection, towing.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABEL).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (new + contacted + quoted)</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, email, phone, vehicle…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No inquiries match these filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="uppercase">
                      {TYPE_LABEL[r.inquiry_type] ?? r.inquiry_type}
                    </Badge>
                    <Badge
                      variant={
                        r.status === "won"
                          ? "default"
                          : r.status === "lost" || r.status === "spam"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {r.contact_name} — {r.email}
                    {r.phone && <span className="text-muted-foreground"> · {r.phone}</span>}
                  </div>
                  {r.vehicle_summary && (
                    <div className="text-xs text-muted-foreground">
                      For: {r.vehicle_summary}
                    </div>
                  )}
                  {r.message && (
                    <div className="rounded-md bg-muted/40 p-2 text-sm">{r.message}</div>
                  )}
                  {r.internal_notes && (
                    <div className="rounded-md border border-dashed border-border bg-amber-50/40 p-2 text-xs">
                      <span className="font-medium">Notes:</span> {r.internal_notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(r);
                      setNotes(r.internal_notes ?? "");
                    }}
                  >
                    Notes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal notes</DialogTitle>
            <DialogDescription>
              {editing && `${editing.contact_name} — ${TYPE_LABEL[editing.inquiry_type]}`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Status updates, partner assigned, next follow-up…"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveNotes}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
