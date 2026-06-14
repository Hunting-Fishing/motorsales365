import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Info, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Source = "cloudflare" | "app" | "legal" | "other";

interface EmailRoute {
  id: string;
  address: string;
  destination: string;
  source: Source;
  category: string | null;
  owner: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SOURCES: { value: Source | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "cloudflare", label: "Cloudflare routing" },
  { value: "app", label: "App-sent" },
  { value: "legal", label: "Legal / website" },
  { value: "other", label: "Other" },
];

const emptyForm: Omit<EmailRoute, "id" | "created_at" | "updated_at"> = {
  address: "",
  destination: "",
  source: "cloudflare",
  category: "",
  owner: "",
  notes: "",
  active: true,
};

export function EmailRoutingPanel() {
  const [rows, setRows] = useState<EmailRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Source | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EmailRoute | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("email_routes" as any)
      .select("*")
      .order("source", { ascending: true })
      .order("address", { ascending: true });
    if (error) setErr(error.message);
    else setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.source !== filter) return false;
      if (!q) return true;
      return (
        r.address.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        (r.owner ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of ["cloudflare", "app", "legal", "other"] as Source[]) {
      c[s] = rows.filter((r) => r.source === s).length;
    }
    return c;
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (r: EmailRoute) => {
    setEditing(r);
    setForm({
      address: r.address,
      destination: r.destination,
      source: r.source,
      category: r.category ?? "",
      owner: r.owner ?? "",
      notes: r.notes ?? "",
      active: r.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.address.trim() || !form.destination.trim()) {
      toast.error("Address and destination are required");
      return;
    }
    setSaving(true);
    const payload = {
      address: form.address.trim().toLowerCase(),
      destination: form.destination.trim().toLowerCase(),
      source: form.source,
      category: form.category?.trim() || null,
      owner: form.owner?.trim() || null,
      notes: form.notes?.trim() || null,
      active: form.active,
    };
    const res = editing
      ? await supabase.from("email_routes" as any).update(payload).eq("id", editing.id)
      : await supabase.from("email_routes" as any).insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? "Route updated" : "Route added");
    setOpen(false);
    load();
  };

  const remove = async (r: EmailRoute) => {
    if (!confirm(`Delete routing entry for ${r.address}?`)) return;
    const { error } = await supabase.from("email_routes" as any).delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const toggleActive = async (r: EmailRoute) => {
    const { error } = await supabase
      .from("email_routes" as any)
      .update({ active: !r.active })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Email routing</h2>
          <p className="text-xs text-muted-foreground">
            Every email address connected to this business — Cloudflare forwards, app templates,
            and legal contacts on the website.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a
              href="https://dash.cloudflare.com/?to=/:account/365motorsales.com/email/routing/routes"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Cloudflare Routing
            </a>
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" />
            Add route
          </Button>
        </div>
      </div>

      <div className="mb-3 flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
        <div>
          This is a local <strong>registry</strong> of who-mails-where. Real inbound routing for
          <code className="mx-1">@365motorsales.com</code> lives in Cloudflare — editing rows
          here does <strong>not</strong> redirect mail. Use the{" "}
          <strong>Cloudflare Routing</strong> button to manage the actual rules.
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label} ({counts[s.value] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search address, destination, owner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Address</th>
              <th className="p-2">→ Destination</th>
              <th className="p-2">Source</th>
              <th className="p-2">Owner</th>
              <th className="p-2">Category</th>
              <th className="p-2">Active</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No routes match.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-2 font-medium">{r.address}</td>
                <td className="p-2 text-muted-foreground">{r.destination}</td>
                <td className="p-2">
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {r.source}
                  </span>
                </td>
                <td className="p-2">{r.owner ?? "—"}</td>
                <td className="p-2">{r.category ?? "—"}</td>
                <td className="p-2">
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} />
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit route" : "Add email route"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Address</Label>
              <Input
                placeholder="e.g. sales@365motorsales.com"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label>Forwards / handled by</Label>
              <Input
                placeholder="e.g. jordilwbailey@gmail.com"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as Source })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloudflare">Cloudflare routing</SelectItem>
                    <SelectItem value="app">App-sent</SelectItem>
                    <SelectItem value="legal">Legal / website</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Owner</Label>
                <Input
                  placeholder="Person responsible"
                  value={form.owner ?? ""}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Category</Label>
              <Input
                placeholder="e.g. sales, finance, support, privacy"
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
