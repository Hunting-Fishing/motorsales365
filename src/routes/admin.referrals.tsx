import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Copy, QrCode, Tag, Plus, Trash2, Users, MousePointerClick,
  UserPlus, Percent, Pencil, Printer, FileSpreadsheet, Calendar, RefreshCw,
  Power, History, ArrowUp, ArrowDown, ArrowUpDown, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferrals,
});

type StaffRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  referral_code: string;
  qr_storage_path: string | null;
  active: boolean;
  notes: string | null;
  staff_user_id: string | null;
};

type AuditEntry = {
  id: string;
  staff_referral_id: string | null;
  staff_email: string | null;
  actor_id: string | null;
  action: string;
  details: any;
  created_at: string;
};

type Promo = {
  id: string;
  staff_referral_id: string;
  title: string;
  description: string | null;
  kind: string;
  percent_off: number | null;
  flat_amount_php: number | null;
  applies_to: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  terms: string | null;
};

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "staff";
  return `${base}${String(Math.floor(Math.random() * 900) + 100)}`;
}

const PUBLIC_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://365motorsales.com";

const sb = supabase as any;

type RangeKey = "7" | "30" | "90" | "all";
const RANGE_LABELS: Record<RangeKey, string> = { "7": "7 days", "30": "30 days", "90": "90 days", all: "All time" };

function sinceFor(range: RangeKey): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(range));
  return d.toISOString();
}

function AdminReferrals() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [actors, setActors] = useState<Record<string, { name: string; email: string }>>({});
  const [stats, setStats] = useState<Record<string, { scans: number; signups: number; visitors: number; listings: number }>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("30");
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [promosFor, setPromosFor] = useState<StaffRow | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "email" | "code" | "status" | "scans" | "visitors" | "signups" | "listings">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [auditAction, setAuditAction] = useState<string>("all");
  const [auditActor, setAuditActor] = useState<string>("all");
  const [auditFrom, setAuditFrom] = useState<string>("");
  const [auditTo, setAuditTo] = useState<string>("");
  const [confirmToggle, setConfirmToggle] = useState<StaffRow | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = async (rangeKey: RangeKey = range) => {
    setLoading(true);
    const { data, error } = await sb
      .from("staff_referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const staffRows = (data as StaffRow[]) || [];
    setRows(staffRows);

    // Fetch roles for each staff_user_id
    const userIds = staffRows.map((r) => r.staff_user_id).filter(Boolean) as string[];
    if (userIds.length > 0) {
      const { data: ur } = await sb.from("user_roles").select("user_id, role").in("user_id", userIds);
      const map: Record<string, string[]> = {};
      ((ur as any[] | null) || []).forEach((x) => {
        (map[x.user_id] ||= []).push(x.role);
      });
      setRoles(map);
    } else {
      setRoles({});
    }

    const since = sinceFor(rangeKey);

    let scansQ = sb.from("qr_scans").select("referral_code,visitor_id,scanned_at");
    if (since) scansQ = scansQ.gte("scanned_at", since);
    const { data: scans } = await scansQ;

    let signupsQ = sb.from("user_referrals").select("referred_by_staff_id,user_id,signup_date");
    if (since) signupsQ = signupsQ.gte("signup_date", since);
    const { data: signups } = await signupsQ;

    // Listings created by referred users (any time). We map listings -> staff via user_referrals.
    const referredUserIds = ((signups as any[] | null) || []).map((s) => s.user_id).filter(Boolean);
    let listingsByUser: Record<string, number> = {};
    if (referredUserIds.length > 0) {
      const { data: ls } = await sb
        .from("listings")
        .select("user_id")
        .in("user_id", referredUserIds);
      ((ls as any[] | null) || []).forEach((l) => {
        listingsByUser[l.user_id] = (listingsByUser[l.user_id] || 0) + 1;
      });
    }

    const s: Record<string, { scans: number; signups: number; visitors: number; listings: number }> = {};
    staffRows.forEach((r) => (s[r.id] = { scans: 0, signups: 0, visitors: 0, listings: 0 }));
    const visitorSet: Record<string, Set<string>> = {};
    ((scans as any[] | null) || []).forEach((x) => {
      const row = staffRows.find((r) => r.referral_code === x.referral_code);
      if (!row) return;
      s[row.id].scans++;
      visitorSet[row.id] ||= new Set();
      if (x.visitor_id) visitorSet[row.id].add(x.visitor_id);
    });
    Object.keys(visitorSet).forEach((k) => (s[k].visitors = visitorSet[k].size));
    ((signups as any[] | null) || []).forEach((x) => {
      if (!x.referred_by_staff_id || !s[x.referred_by_staff_id]) return;
      s[x.referred_by_staff_id].signups++;
      s[x.referred_by_staff_id].listings += listingsByUser[x.user_id] || 0;
    });
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const generateQrFor = async (row: StaffRow, oldCode?: string) => {
    const url = `${PUBLIC_BASE}/r/${row.referral_code}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    // Key storage path by staff id so referral_code renames don't orphan PNGs.
    const path = `${row.id}.png`;
    const { error: upErr } = await supabase.storage
      .from("qr-codes")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (upErr) {
      toast.error("Could not upload QR: " + upErr.message);
      return null;
    }
    // Clean up legacy code-keyed object if it exists.
    const legacyPaths = [
      oldCode ? `${oldCode}.png` : null,
      row.qr_storage_path && row.qr_storage_path !== path ? row.qr_storage_path : null,
    ].filter(Boolean) as string[];
    if (legacyPaths.length > 0) {
      await supabase.storage.from("qr-codes").remove(legacyPaths).catch(() => {});
    }
    await sb.from("staff_referrals").update({ qr_storage_path: path }).eq("id", row.id);
    return path;
  };

  const publicQrUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("qr-codes").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async (input: {
    full_name: string;
    email: string;
    phone: string;
    referral_code: string;
  }) => {
    const { data, error } = await sb
      .from("staff_referrals")
      .insert({
        full_name: input.full_name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || null,
        referral_code: input.referral_code.toLowerCase().trim(),
        active: true,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await generateQrFor(data as StaffRow);
    toast.success("Staff QR created");
    setNewOpen(false);
    load();
  };

  const handleUpdate = async (row: StaffRow, oldCode?: string) => {
    const { error } = await sb
      .from("staff_referrals")
      .update({
        full_name: row.full_name,
        email: row.email.toLowerCase().trim(),
        phone: row.phone,
        referral_code: row.referral_code.toLowerCase().trim(),
        active: row.active,
        notes: row.notes,
      })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await generateQrFor(row, oldCode);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (row: StaffRow) => {
    if (!confirm(`Delete ${row.full_name}'s referral?`)) return;
    if (row.qr_storage_path) {
      await supabase.storage.from("qr-codes").remove([row.qr_storage_path]).catch(() => {});
    }
    if (user) {
      await sb.from("staff_referral_audit").insert({
        staff_referral_id: row.id, staff_email: row.email, actor_id: user.id,
        action: "deleted",
        details: { referral_code: row.referral_code, full_name: row.full_name },
      });
    }
    const { error } = await sb.from("staff_referrals").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  };

  const requestToggle = (row: StaffRow) => {
    setConfirmReason("");
    setConfirmToggle(row);
  };

  const submitToggle = async () => {
    if (!confirmToggle) return;
    if (confirmReason.trim().length < 3) { toast.error("Please provide a reason (min 3 chars)"); return; }
    setConfirmBusy(true);
    const row = confirmToggle;
    const next = !row.active;
    const { error } = await sb.from("staff_referrals").update({ active: next }).eq("id", row.id);
    if (error) { toast.error(error.message); setConfirmBusy(false); return; }
    if (user) {
      await sb.from("staff_referral_audit").insert({
        staff_referral_id: row.id, staff_email: row.email, actor_id: user.id,
        action: "reason_logged",
        details: {
          for_action: next ? "activated" : "deactivated",
          reason: confirmReason.trim(),
          referral_code: row.referral_code,
          full_name: row.full_name,
        },
      });
    }
    toast.success(next ? "Reactivated" : "Deactivated");
    setConfirmBusy(false);
    setConfirmToggle(null);
    setConfirmReason("");
    load();
    if (showAudit) loadAudit();
  };

  const loadAudit = async () => {
    let q = sb
      .from("staff_referral_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (auditAction !== "all") q = q.eq("action", auditAction);
    if (auditActor !== "all") q = q.eq("actor_id", auditActor);
    if (auditFrom) q = q.gte("created_at", new Date(auditFrom).toISOString());
    if (auditTo) {
      const t = new Date(auditTo); t.setHours(23, 59, 59, 999);
      q = q.lte("created_at", t.toISOString());
    }
    const { data } = await q;
    const entries = (data as AuditEntry[]) || [];
    setAudit(entries);
    const actorIds = Array.from(new Set(entries.map((e) => e.actor_id).filter(Boolean) as string[]));
    if (actorIds.length > 0) {
      const { data: profs } = await sb.from("profiles").select("id, full_name").in("id", actorIds);
      const map: Record<string, { name: string; email: string }> = {};
      ((profs as any[] | null) || []).forEach((p) => {
        map[p.id] = { name: p.full_name || "", email: "" };
      });
      setActors(map);
    }
  };

  useEffect(() => { if (showAudit) loadAudit(); /* eslint-disable-next-line */ }, [showAudit, auditAction, auditActor, auditFrom, auditTo]);

  const logSync = async (count: number) => {
    if (!user) return;
    await sb.from("staff_referral_audit").insert({
      actor_id: user.id,
      action: "sync_run",
      details: { synced_count: count },
    });
  };

  const totals = useMemo(() => {
    const codes = rows.length;
    const active = rows.filter((r) => r.active).length;
    let scans = 0, visitors = 0, signups = 0, listings = 0;
    Object.values(stats).forEach((s) => {
      scans += s.scans; visitors += s.visitors; signups += s.signups; listings += s.listings;
    });
    const conversion = visitors > 0 ? Math.round((signups / visitors) * 1000) / 10 : 0;
    return { codes, active, scans, visitors, signups, listings, conversion };
  }, [rows, stats]);

  const topPerformers = useMemo(() => {
    return rows
      .map((r) => ({ row: r, s: stats[r.id] || { scans: 0, signups: 0, visitors: 0, listings: 0 } }))
      .sort((a, b) => b.s.visitors - a.s.visitors)
      .slice(0, 5);
  }, [rows, stats]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "inactive" && r.active) return false;
      if (roleFilter !== "all") {
        const ur = r.staff_user_id ? roles[r.staff_user_id] || [] : [];
        if (roleFilter === "none") {
          if (ur.length > 0) return false;
        } else if (!ur.includes(roleFilter)) {
          return false;
        }
      }
      if (q) {
        const hay = `${r.full_name} ${r.email} ${r.referral_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, roles, roleFilter, statusFilter, search]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const sa = stats[a.id] || { scans: 0, visitors: 0, signups: 0, listings: 0 };
      const sb_ = stats[b.id] || { scans: 0, visitors: 0, signups: 0, listings: 0 };
      let av: any, bv: any;
      switch (sortKey) {
        case "name": av = a.full_name?.toLowerCase() || ""; bv = b.full_name?.toLowerCase() || ""; break;
        case "email": av = a.email?.toLowerCase() || ""; bv = b.email?.toLowerCase() || ""; break;
        case "code": av = a.referral_code; bv = b.referral_code; break;
        case "status": av = a.active ? 1 : 0; bv = b.active ? 1 : 0; break;
        case "scans": av = sa.scans; bv = sb_.scans; break;
        case "visitors": av = sa.visitors; bv = sb_.visitors; break;
        case "signups": av = sa.signups; bv = sb_.signups; break;
        case "listings": av = sa.listings; bv = sb_.listings; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredRows, sortKey, sortDir, stats]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRows, currentPage, pageSize],
  );

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, sortKey, sortDir, pageSize]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const auditActorOptions = useMemo(() => {
    const ids = Array.from(new Set(audit.map((e) => e.actor_id).filter(Boolean) as string[]));
    return ids.map((id) => ({ id, name: actors[id]?.name || id.slice(0, 8) }));
  }, [audit, actors]);

  const exportCsv = () => {
    const header = ["full_name", "email", "code", "active", "scans", "visitors", "signups", "listings", "conversion_pct", "url"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const s = stats[r.id] || { scans: 0, signups: 0, visitors: 0, listings: 0 };
      const conv = s.visitors > 0 ? Math.round((s.signups / s.visitors) * 1000) / 10 : 0;
      const row = [
        JSON.stringify(r.full_name),
        JSON.stringify(r.email),
        r.referral_code,
        r.active ? "yes" : "no",
        s.scans,
        s.visitors,
        s.signups,
        s.listings,
        conv,
        `${PUBLIC_BASE}/r/${r.referral_code}`,
      ];
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-referrals-${range}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff QR Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Personal referral codes, QR posters, and offers per staff member.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger className="h-7 w-[120px] border-0 bg-transparent p-0 text-sm focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={async () => {
            const { data, error } = await sb.rpc("sync_staff_referrals");
            if (error) { toast.error(error.message); return; }
            const count = (data as number) ?? 0;
            toast.success(`Synced ${count} staff`);
            await logSync(count);
            // Generate QR codes for any newly created rows that don't have one yet
            const { data: missing } = await sb
              .from("staff_referrals")
              .select("id,referral_code,qr_storage_path,full_name,email,phone,active,notes,staff_user_id")
              .is("qr_storage_path", null);
            for (const m of (missing as StaffRow[]) || []) {
              await generateQrFor(m);
            }
            load();
            if (showAudit) loadAudit();
          }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Sync staff
          </Button>
          <Button variant={showAudit ? "default" : "outline"} onClick={() => setShowAudit((v) => !v)}>
            <History className="mr-2 h-4 w-4" /> Audit log
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New staff QR
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Active codes"
          value={`${totals.active}/${totals.codes}`}
          hint="Codes currently crediting signups"
        />
        <KpiCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Unique visitors"
          value={totals.visitors.toLocaleString()}
          hint={`${totals.scans.toLocaleString()} scans in ${RANGE_LABELS[range].toLowerCase()}`}
        />
        <KpiCard
          icon={<UserPlus className="h-4 w-4" />}
          label="Credited signups"
          value={totals.signups.toLocaleString()}
          hint={`${totals.listings.toLocaleString()} listings by referred users`}
        />
        <KpiCard
          icon={<Percent className="h-4 w-4" />}
          label="Conversion"
          value={`${totals.conversion}%`}
          hint="Signups ÷ unique visitors"
        />
      </section>

      {topPerformers.length > 0 && totals.visitors > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Top performers ({RANGE_LABELS[range].toLowerCase()})</h2>
          <ul className="space-y-2">
            {topPerformers.map(({ row, s }) => {
              const max = topPerformers[0].s.visitors || 1;
              const pct = Math.round((s.visitors / max) * 100);
              return (
                <li key={row.id} className="flex items-center gap-3 text-sm">
                  <div className="w-32 shrink-0 truncate font-medium">{row.full_name}</div>
                  <div className="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground">
                    {row.referral_code}
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-40 shrink-0 text-right text-xs text-muted-foreground">
                    {s.visitors} visitors · {s.signups} signups
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative w-full sm:w-auto sm:min-w-[260px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or code"
            className="h-8 pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="advertising">Advertising</SelectItem>
              <SelectItem value="none">No role / external</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Showing {sortedRows.length} of {rows.length}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left">
              <SortableTh label="Staff" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2">Role</th>
              <SortableTh label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Scans" k="scans" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Visitors" k="visitors" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Signups" k="signups" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Listings" k="listings" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : pagedRows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No staff referrals match your filters.</td></tr>
            ) : (
              pagedRows.map((r) => {
                const s = stats[r.id] || { scans: 0, signups: 0, visitors: 0, listings: 0 };
                const qr = publicQrUrl(r.qr_storage_path);
                const link = `${PUBLIC_BASE}/r/${r.referral_code}`;
                const posterUrl = `${PUBLIC_BASE}/r/${r.referral_code}/poster`;
                const userRoles = r.staff_user_id ? roles[r.staff_user_id] || [] : [];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {qr ? (
                          <img src={qr} alt="" className="h-12 w-12 shrink-0 rounded border border-border bg-white object-contain p-0.5" />
                        ) : (
                          <button
                            type="button"
                            onClick={async () => { await generateQrFor(r); toast.success("QR generated"); load(); }}
                            title="Generate QR"
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted text-muted-foreground hover:bg-secondary"
                          >
                            <QrCode className="h-5 w-5" />
                          </button>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {userRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((ro) => (
                            <span key={ro} className="rounded bg-secondary px-1.5 py-0.5 text-xs uppercase">{ro}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.referral_code}</td>
                    <td className="px-4 py-3">{s.scans}</td>
                    <td className="px-4 py-3">{s.visitors}</td>
                    <td className="px-4 py-3">{s.signups}</td>
                    <td className="px-4 py-3">{s.listings}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${r.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Copy link"
                          onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {qr && (
                          <a href={qr} download={`${r.referral_code}.png`} title="Download QR">
                            <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                          </a>
                        )}
                        <a href={posterUrl} target="_blank" rel="noreferrer" title="Print poster">
                          <Button size="sm" variant="ghost"><Printer className="h-4 w-4" /></Button>
                        </a>
                        <Button size="sm" variant="ghost" title="Promotions" onClick={() => setPromosFor(r)}>
                          <Tag className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={r.active ? "Deactivate" : "Reactivate"}
                          onClick={() => requestToggle(r)}
                        >
                          <Power className={`h-4 w-4 ${r.active ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditing(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-7 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span>Page {currentPage} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </div>

      {showAudit && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Audit log</h2>
              <p className="text-xs text-muted-foreground">Up to 200 most recent matching staff referral changes.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={loadAudit}><RefreshCw className="mr-1 h-3 w-3" /> Refresh</Button>
          </div>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</Label>
              <Select value={auditAction} onValueChange={setAuditAction}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="created">created</SelectItem>
                  <SelectItem value="activated">activated</SelectItem>
                  <SelectItem value="deactivated">deactivated</SelectItem>
                  <SelectItem value="qr_generated">qr_generated</SelectItem>
                  <SelectItem value="sync_run">sync_run</SelectItem>
                  <SelectItem value="deleted">deleted</SelectItem>
                  <SelectItem value="reason_logged">reason_logged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</Label>
              <Select value={auditActor} onValueChange={setAuditActor}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All admins</SelectItem>
                  {auditActorOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
              <Input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} className="h-8 w-[150px]" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
              <Input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} className="h-8 w-[150px]" />
            </div>
            {(auditAction !== "all" || auditActor !== "all" || auditFrom || auditTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setAuditAction("all"); setAuditActor("all"); setAuditFrom(""); setAuditTo(""); }}>
                Clear
              </Button>
            )}
          </div>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Admin</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-secondary px-1.5 py-0.5 uppercase">{e.action}</span>
                      </td>
                      <td className="px-3 py-2">{e.staff_email || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">
                        {e.actor_id
                          ? (actors[e.actor_id]?.name || e.actor_id.slice(0, 8))
                          : <span className="text-muted-foreground">system</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {e.details && Object.keys(e.details).length > 0
                          ? JSON.stringify(e.details)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => { if (!o) { setConfirmToggle(null); setConfirmReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.active ? "Deactivate" : "Reactivate"} {confirmToggle?.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? "Inactive codes still log scans but won't credit signups."
                : "This code will resume crediting signups for new visitors."}
              {" "}Code: <span className="font-mono">{confirmToggle?.referral_code}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason (required, logged in audit)</Label>
            <Textarea
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              placeholder="e.g. Staff offboarded, QR misprinted, suspected abuse…"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmBusy || confirmReason.trim().length < 3}
              onClick={(e) => { e.preventDefault(); submitToggle(); }}
            >
              {confirmToggle?.active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {newOpen && <StaffDialog onClose={() => setNewOpen(false)} onSubmit={handleCreate} />}
      {editing && (
        <StaffDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => handleUpdate({ ...editing, ...v }, editing.referral_code)}
        />
      )}
      {promosFor && <PromoDialog staff={promosFor} onClose={() => setPromosFor(null)} />}
    </div>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onSort,
}: {
  label: string;
  k: "name" | "email" | "code" | "status" | "scans" | "visitors" | "signups" | "listings";
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: any) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-2">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </th>
  );
}

function StaffDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: StaffRow;
  onClose: () => void;
  onSubmit: (v: { full_name: string; email: string; phone: string; referral_code: string; active?: boolean; notes?: string }) => void;
}) {
  const [full_name, setFullName] = useState(initial?.full_name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [referral_code, setReferralCode] = useState(initial?.referral_code || "");
  const [active, setActive] = useState(initial?.active ?? true);

  useEffect(() => {
    if (!initial && full_name && !referral_code) setReferralCode(slugify(full_name));
  }, [full_name, initial, referral_code]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit staff QR" : "New staff QR"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Company email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Referral code</Label>
            <Input value={referral_code} onChange={(e) => setReferralCode(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">URL: {PUBLIC_BASE}/r/{referral_code || "code"}</p>
          </div>
          {initial && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><div className="text-sm font-medium">Active</div><p className="text-xs text-muted-foreground">Inactive codes still log scans but don’t credit signups.</p></div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit({ full_name, email, phone, referral_code, active })}
            disabled={!full_name || !email || !referral_code}
          >
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_PROMO: Partial<Promo> = {
  title: "", description: "", kind: "promo", applies_to: "any", active: true,
  percent_off: null, flat_amount_php: null, starts_at: null, ends_at: null, terms: "",
};

function PromoDialog({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Partial<Promo>>(EMPTY_PROMO);

  const load = async () => {
    const { data } = await sb.from("staff_promotions").select("*")
      .eq("staff_referral_id", staff.id).order("created_at", { ascending: false });
    setPromos((data as Promo[]) || []);
  };
  useEffect(() => { load(); }, [staff.id]);

  const startEdit = (p: Promo) => {
    setEditingId(p.id);
    setForm({ ...p });
  };
  const startCreate = () => {
    setEditingId("new");
    setForm(EMPTY_PROMO);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_PROMO);
  };

  const submit = async () => {
    const payload = {
      title: form.title!,
      description: form.description || null,
      kind: form.kind || "promo",
      percent_off: form.percent_off || null,
      flat_amount_php: form.flat_amount_php || null,
      applies_to: form.applies_to || "any",
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      terms: form.terms || null,
    };
    if (editingId === "new") {
      const { error } = await sb.from("staff_promotions").insert({
        staff_referral_id: staff.id, active: true, ...payload,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Promotion added");
    } else if (editingId) {
      const { error } = await sb.from("staff_promotions").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Promotion saved");
    }
    cancelEdit();
    load();
  };

  const toggle = async (p: Promo) => {
    await sb.from("staff_promotions").update({ active: !p.active }).eq("id", p.id);
    load();
  };
  const del = async (p: Promo) => {
    if (!confirm("Delete this promotion?")) return;
    await sb.from("staff_promotions").delete().eq("id", p.id);
    load();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Promotions for {staff.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {promos.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground">No offers attached yet.</p>
          )}
          {promos.map((p) => editingId === p.id ? (
            <PromoForm key={p.id} form={form} setForm={setForm} onCancel={cancelEdit} onSubmit={submit} submitLabel="Save" />
          ) : (
            <div key={p.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {p.title}
                    <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs uppercase">{p.kind}</span>
                    {!p.active && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">paused</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.percent_off ? `${p.percent_off}% off · ` : ""}
                    {p.flat_amount_php ? `₱${p.flat_amount_php} · ` : ""}
                    applies to {p.applies_to}
                    {p.ends_at ? ` · ends ${new Date(p.ends_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" title="Edit" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.active ? "Pause" : "Resume"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}

          {editingId === "new" ? (
            <PromoForm form={form} setForm={setForm} onCancel={cancelEdit} onSubmit={submit} submitLabel="Add" />
          ) : editingId === null ? (
            <Button variant="outline" onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add promotion</Button>
          ) : null}
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoForm({
  form, setForm, onCancel, onSubmit, submitLabel,
}: {
  form: Partial<Promo>;
  setForm: (f: Partial<Promo>) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/20">
      <div><Label>Title</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kind</Label>
          <Select value={form.kind || "promo"} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="promo">Promo</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
              <SelectItem value="rate">Rate</SelectItem>
              <SelectItem value="incentive">Incentive</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Applies to</Label>
          <Select value={form.applies_to || "any"} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="listing_fee">Listing fee</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="tow">Tow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>% off</Label><Input type="number" value={form.percent_off ?? ""} onChange={(e) => setForm({ ...form, percent_off: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><Label>Flat ₱</Label><Input type="number" value={form.flat_amount_php ?? ""} onChange={(e) => setForm({ ...form, flat_amount_php: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><Label>Starts</Label><Input type="date" value={form.starts_at?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })} /></div>
        <div><Label>Ends</Label><Input type="date" value={form.ends_at?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })} /></div>
      </div>
      <div><Label>Terms</Label><Textarea value={form.terms || ""} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!form.title}>{submitLabel}</Button>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display mt-2 text-2xl font-bold">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
