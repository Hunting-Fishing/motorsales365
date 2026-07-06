import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Plus,
  Trash2,
  UserCog,
  X,
  Zap,
  History,
  Download,
  ExternalLink,
  Mail,
  Phone,
  CalendarClock,
  Users as UsersIcon,
  Building2,
  Store,
  LifeBuoy,
} from "lucide-react";
import {
  adminListReps,
  adminListAssignments,
  adminAssignRep,
  adminUnassign,
  adminBulkAssignByTerritory,
  adminAddTerritory,
  adminRemoveTerritory,
  adminSaveRepProfile,
  adminListAuditLog,
  adminGetRepDetail,
  adminGetReferredUserDetail,
  adminAutoSetupTerritory,

} from "@/lib/sales-rep.functions";
import { PSGC, regionLabel, provincesOf, citiesOf } from "@/lib/psgc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/sales-reps")({
  component: SalesRepsAdmin,
});

type Rep = {
  user_id: string;
  email: string;
  profile: any;
  rep_profile: any;
  territories: any[];
  active_accounts: number;
};

function repName(r: Rep): string {
  return (
    r.profile?.full_name ||
    [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") ||
    r.email ||
    r.user_id.slice(0, 8)
  );
}

function SalesRepsAdmin() {
  const [activeRep, setActiveRep] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UserCog className="h-6 w-6" /> Sales Reps
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage sales reps, their territories, and assigned accounts.
          </p>
        </div>
      </div>

      <Tabs defaultValue="reps">
        <TabsList>
          <TabsTrigger value="reps">Reps</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="reps" className="mt-4">
          <RepsTab onSelect={setActiveRep} />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="territories" className="mt-4">
          <TerritoriesTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab />
        </TabsContent>
      </Tabs>

      <RepDetailSheet
        repUserId={activeRep}
        onClose={() => setActiveRep(null)}
      />
    </div>
  );
}

/* ----------------------- Reps Tab ----------------------- */

function useReps() {
  const fn = useServerFn(adminListReps);
  return useQuery({
    queryKey: ["admin-sales-reps"],
    queryFn: () => fn(),
  });
}

function RepsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isLoading } = useReps();
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reps…
      </div>
    );
  }
  const reps: Rep[] = data?.reps ?? [];
  if (!reps.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No sales reps yet. Grant a user the "sales" role from Users.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Rep</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Accounts</th>
            <th className="px-3 py-2">Territories</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {reps.map((r) => (
            <tr key={r.user_id} className="border-t">
              <td className="px-3 py-2">
                <div className="font-medium">{repName(r)}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
              </td>
              <td className="px-3 py-2">{r.rep_profile?.title ?? "—"}</td>
              <td className="px-3 py-2">{r.active_accounts}</td>
              <td className="px-3 py-2">{r.territories.length}</td>
              <td className="px-3 py-2">
                {r.rep_profile?.accepting_new_clients === false ? (
                  <Badge variant="secondary">Not accepting</Badge>
                ) : (
                  <Badge>Active</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant="outline" onClick={() => onSelect(r.user_id)}>
                  Manage
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------- Assignments Tab -------------------- */

function AssignmentsTab() {
  const { data: repsData } = useReps();
  const reps: Rep[] = repsData?.reps ?? [];
  const [filters, setFilters] = useState<{
    rep_user_id?: string;
    source?: "referral" | "manual" | "territory";
    subject_type?: "user" | "business";
    q?: string;
  }>({});
  const qc = useQueryClient();

  const listFn = useServerFn(adminListAssignments);
  const unassignFn = useServerFn(adminUnassign);
  const bulkFn = useServerFn(adminBulkAssignByTerritory);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-sales-assignments", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const unassign = useMutation({
    mutationFn: (id: string) => unassignFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Unassigned");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-sales-reps"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const bulk = useMutation({
    mutationFn: () => bulkFn(),
    onSuccess: (res: any) => {
      toast.success(`Auto-assigned ${res?.assigned ?? 0} account(s)`);
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-sales-reps"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [confirmBulk, setConfirmBulk] = useState(false);
  const [reassignFor, setReassignFor] = useState<any | null>(null);

  const rows = data?.assignments ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Rep</Label>
          <Select
            value={filters.rep_user_id ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, rep_user_id: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reps</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.user_id} value={r.user_id}>{repName(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Source</Label>
          <Select
            value={filters.source ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, source: v === "all" ? undefined : (v as any) }))
            }
          >
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any source</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="territory">Territory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={filters.subject_type ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, subject_type: v === "all" ? undefined : (v as any) }))
            }
          >
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="business">Businesses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Search</Label>
          <Input
            className="w-56"
            placeholder="Name, city, region…"
            value={filters.q ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setConfirmBulk(true)} disabled={bulk.isPending}>
            <Zap className="mr-1.5 h-4 w-4" />
            Auto-assign by territory
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </td></tr>
            ) : !rows.length ? (
              <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                No assignments match these filters.
              </td></tr>
            ) : (
              rows.map((r: any) => {
                const subj = r.subject ?? {};
                const subjName =
                  subj.full_name ||
                  subj.name ||
                  [subj.first_name, subj.last_name].filter(Boolean).join(" ") ||
                  r.subject_id.slice(0, 8);
                const subjLoc = [
                  subj.signup_city ?? subj.business_city,
                  subj.signup_region ?? subj.business_region,
                ].filter(Boolean).join(", ");
                const repLabel =
                  r.rep?.full_name ||
                  [r.rep?.first_name, r.rep?.last_name].filter(Boolean).join(" ") ||
                  r.rep_user_id.slice(0, 8);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{subjName}</div>
                      {subjLoc ? <div className="text-xs text-muted-foreground">{subjLoc}</div> : null}
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline">{r.subject_type}</Badge></td>
                    <td className="px-3 py-2">{repLabel}</td>
                    <td className="px-3 py-2"><Badge variant="secondary">{r.source}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setReassignFor(r)}>
                        Reassign
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => unassign.mutate(r.id)}
                      >
                        Unassign
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ReassignDialog
        assignment={reassignFor}
        reps={reps}
        onClose={() => setReassignFor(null)}
        onDone={() => {
          setReassignFor(null);
          refetch();
        }}
      />

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-assign by territory?</AlertDialogTitle>
            <AlertDialogDescription>
              Users without an active rep will be assigned to the rep whose territory
              (region → province → city) matches their signup location. Existing assignments
              are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmBulk(false); bulk.mutate(); }}
            >
              Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReassignDialog({
  assignment,
  reps,
  onClose,
  onDone,
}: {
  assignment: any | null;
  reps: Rep[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [repId, setRepId] = useState<string>("");
  const assignFn = useServerFn(adminAssignRep);
  const mut = useMutation({
    mutationFn: () =>
      assignFn({
        data: {
          rep_user_id: repId,
          subject_type: assignment.subject_type,
          subject_id: assignment.subject_id,
        },
      }),
    onSuccess: () => {
      toast.success("Reassigned");
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  return (
    <AlertDialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reassign to another rep</AlertDialogTitle>
          <AlertDialogDescription>
            Current rep will be replaced with the selected one.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-1">
          <Label className="text-xs">New rep</Label>
          <Select value={repId} onValueChange={setRepId}>
            <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
            <SelectContent>
              {reps.map((r) => (
                <SelectItem key={r.user_id} value={r.user_id}>{repName(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!repId || mut.isPending} onClick={() => mut.mutate()}>
            Reassign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------------------- Territories Tab -------------------- */

function TerritoriesTab() {
  const { data, isLoading, refetch } = useReps();
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  const reps: Rep[] = data?.reps ?? [];
  return (
    <div className="space-y-4">
      {reps.map((r) => (
        <div key={r.user_id} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{repName(r)}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </div>
            <Badge variant="outline">{r.territories.length} territories</Badge>
          </div>
          <TerritoryEditor repUserId={r.user_id} territories={r.territories} onChange={refetch} />
        </div>
      ))}
    </div>
  );
}

function TerritoryEditor({
  repUserId,
  territories,
  onChange,
}: {
  repUserId: string;
  territories: any[];
  onChange: () => void;
}) {
  const addFn = useServerFn(adminAddTerritory);
  const rmFn = useServerFn(adminRemoveTerritory);

  const [region, setRegion] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [primary, setPrimary] = useState(false);

  const provinces = useMemo(() => provincesOf(region), [region]);
  const cities = useMemo(() => citiesOf(region, province || null), [region, province]);

  const add = useMutation({
    mutationFn: () =>
      addFn({
        data: {
          rep_user_id: repUserId,
          region,
          province: province || null,
          city: city || null,
          is_primary: primary,
        },
      }),
    onSuccess: () => {
      toast.success("Territory added");
      setRegion(""); setProvince(""); setCity(""); setPrimary(false);
      onChange();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rm = useMutation({
    mutationFn: (id: string) => rmFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); onChange(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {territories.length ? territories.map((t) => (
          <Badge key={t.id} variant={t.is_primary ? "default" : "secondary"} className="gap-1">
            <MapPin className="h-3 w-3" />
            {[t.region, t.province, t.city].filter(Boolean).join(" › ")}
            <button onClick={() => rm.mutate(t.id)} className="ml-1 opacity-70 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )) : (
          <span className="text-xs text-muted-foreground">No territories yet.</span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/30 p-2">
        <div className="grid gap-1">
          <Label className="text-xs">Region</Label>
          <Select value={region} onValueChange={(v) => { setRegion(v); setProvince(""); setCity(""); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              {PSGC.map((r) => (
                <SelectItem key={r.code} value={regionLabel(r)}>{regionLabel(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Province (optional)</Label>
          <Select value={province || "_any"} onValueChange={(v) => { setProvince(v === "_any" ? "" : v); setCity(""); }} disabled={!region || !provinces.length}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">Any province</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">City (optional)</Label>
          <Select value={city || "_any"} onValueChange={(v) => setCity(v === "_any" ? "" : v)} disabled={!region || !cities.length}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">Any city</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={primary} onCheckedChange={setPrimary} id={`prim-${repUserId}`} />
          <Label htmlFor={`prim-${repUserId}`} className="text-xs">Primary</Label>
        </div>
        <Button size="sm" disabled={!region || add.isPending} onClick={() => add.mutate()}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}

/* -------------------- Rep Detail Sheet -------------------- */

function RepDetailSheet({ repUserId, onClose }: { repUserId: string | null; onClose: () => void }) {
  const { data, refetch } = useReps();
  const rep: Rep | undefined = data?.reps?.find((r: Rep) => r.user_id === repUserId);
  const saveFn = useServerFn(adminSaveRepProfile);
  const detailFn = useServerFn(adminGetRepDetail);
  const autoSetupFn = useServerFn(adminAutoSetupTerritory);
  const autoSetup = useMutation({
    mutationFn: () => autoSetupFn({ data: { rep_user_id: repUserId! } }),
    onSuccess: (res: any) => {
      if (res?.added) {
        toast.success(
          `Added ${[res.region, res.city].filter(Boolean).join(" › ") || "signup area"} as primary territory`,
        );
        refetch();
        detailQ.refetch();
      } else if (res?.reason === "already_has_territories") {
        toast.info("Rep already has territories");
      } else if (res?.reason === "no_signup_area") {
        toast.error("No signup region on this rep's profile — add one manually");
      } else {
        toast.info("Nothing to auto-populate");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const [days, setDays] = useState<number>(30);

  const detailQ = useQuery({
    queryKey: ["admin-rep-detail", repUserId, days],
    queryFn: () => detailFn({ data: { rep_user_id: repUserId!, days } }),
    enabled: !!repUserId,
  });
  const detail = detailQ.data;

  const [form, setForm] = useState<any>({});
  const [lastId, setLastId] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState("");
  const [refFilter, setRefFilter] = useState<"all" | "spend" | "nospend" | "signup_only" | "qr" | "link">("all");
  const [refSort, setRefSort] = useState<
    "commission_desc" | "commission_asc" | "spent_desc" | "spent_asc" | "recent" | "oldest" | "name"
  >("commission_desc");
  const [refPage, setRefPage] = useState(1);
  const [refPageSize, setRefPageSize] = useState<number>(25);
  const [drilldownUserId, setDrilldownUserId] = useState<string | null>(null);

  if (rep && lastId !== rep.user_id) {
    setLastId(rep.user_id);
    setRefSearch("");
    setRefFilter("all");
    setRefSort("commission_desc");
    setRefPage(1);
    setDrilldownUserId(null);

    setForm({
      title: rep.rep_profile?.title ?? "",
      bio: rep.rep_profile?.bio ?? "",
      public_email: rep.rep_profile?.public_email ?? "",
      public_phone: rep.rep_profile?.public_phone ?? "",
      photo_url: rep.rep_profile?.photo_url ?? "",
      accepting_new_clients: rep.rep_profile?.accepting_new_clients ?? true,
      active: rep.rep_profile?.active ?? true,
      commission_rate_override_pct:
        rep.rep_profile?.commission_rate_override != null
          ? String(Number(rep.rep_profile.commission_rate_override) * 100)
          : "",
    });
  }


  const save = useMutation({
    mutationFn: () => {
      const pct = String(form.commission_rate_override_pct ?? "").trim();
      let override: number | null | undefined = undefined;
      if (pct === "") override = null;
      else {
        const n = Number(pct);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          throw new Error("Commission rate must be between 0 and 100");
        }
        override = n / 100;
      }
      return saveFn({
        data: {
          rep_user_id: rep!.user_id,
          title: form.title || null,
          bio: form.bio || null,
          public_email: form.public_email || null,
          public_phone: form.public_phone || null,
          photo_url: form.photo_url || null,
          accepting_new_clients: !!form.accepting_new_clients,
          active: !!form.active,
          commission_rate_override: override,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved");
      refetch();
      detailQ.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const filteredReferred = useMemo(() => {
    const rows: any[] = detail?.referredUsers ?? [];
    const q = refSearch.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (refFilter === "spend" && !(Number(r.spent_php) > 0)) return false;
      if (refFilter === "nospend" && Number(r.spent_php) > 0) return false;
      if (refFilter === "signup_only" && !r.signup_only) return false;
      if (refFilter === "qr" && (r.signup_source ?? "") !== "qr") return false;
      if (refFilter === "link" && (r.signup_source ?? "") !== "link") return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.user_id ?? "").toLowerCase().includes(q)
      );
    });
    const cmp: Record<string, (a: any, b: any) => number> = {
      commission_desc: (a, b) => Number(b.commission_php) - Number(a.commission_php),
      commission_asc: (a, b) => Number(a.commission_php) - Number(b.commission_php),
      spent_desc: (a, b) => Number(b.spent_php) - Number(a.spent_php),
      spent_asc: (a, b) => Number(a.spent_php) - Number(b.spent_php),
      recent: (a, b) =>
        new Date(b.signed_up_at ?? 0).getTime() - new Date(a.signed_up_at ?? 0).getTime(),
      oldest: (a, b) =>
        new Date(a.signed_up_at ?? 0).getTime() - new Date(b.signed_up_at ?? 0).getTime(),
      name: (a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""),
    };
    out = [...out].sort(cmp[refSort]);
    return out;
  }, [detail?.referredUsers, refSearch, refFilter, refSort]);

  const refTotalPages = Math.max(1, Math.ceil(filteredReferred.length / refPageSize));
  const refCurrentPage = Math.min(refPage, refTotalPages);
  const pagedReferred = useMemo(
    () =>
      filteredReferred.slice((refCurrentPage - 1) * refPageSize, refCurrentPage * refPageSize),
    [filteredReferred, refCurrentPage, refPageSize],
  );
  const filteredTotals = useMemo(
    () =>
      filteredReferred.reduce(
        (acc, r) => {
          acc.spent += Number(r.spent_php) || 0;
          acc.commission += Number(r.commission_php) || 0;
          return acc;
        },
        { spent: 0, commission: 0 },
      ),
    [filteredReferred],
  );

  const exportReferredCsv = () => {
    const rows = filteredReferred;

    const header = [
      "user_id",
      "name",
      "email",
      "signup_source",
      "signup_only",
      "credited",
      "signed_up_at",
      "first_redemption_at",
      "last_redemption_at",
      "redemptions",
      "spent_php",
      "commission_rate",
      "commission_php",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r: any) =>
        header
          .map((k) => {
            const v = (r as any)[k];
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referred-users-${rep?.user_id ?? "rep"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <Sheet open={!!repUserId} onOpenChange={(o) => !o && (setLastId(null), onClose())}>

      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {rep ? (
          <>
            <SheetHeader>
              <SheetTitle>{repName(rep)}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{rep.email}</span>
                {(detail?.account?.roles ?? []).map((r: string) => (
                  <Badge key={r} variant="outline" className="text-[10px]">
                    {r}
                  </Badge>
                ))}
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="territories">Territories</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="referred">Referred users</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>

              {/* -------- Overview -------- */}
              <TabsContent value="overview" className="mt-4 space-y-6">
                <AccountCard detail={detail} loading={detailQ.isLoading} rep={rep} />

                <PayoutBreakdown detail={detail} loading={detailQ.isLoading} />



                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Profile</h3>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={form.title ?? ""}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Senior Sales Rep"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Bio</Label>
                      <Textarea
                        value={form.bio ?? ""}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Public email</Label>
                        <Input
                          type="email"
                          value={form.public_email ?? ""}
                          onChange={(e) => setForm({ ...form, public_email: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Public phone</Label>
                        <Input
                          value={form.public_phone ?? ""}
                          onChange={(e) => setForm({ ...form, public_phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Photo URL override</Label>
                      <Input
                        value={form.photo_url ?? ""}
                        onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                        placeholder="Leave blank to use profile avatar"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">
                        Commission rate override (%)
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={form.commission_rate_override_pct ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, commission_rate_override_pct: e.target.value })
                        }
                        placeholder={`Leave blank to use site default (${(
                          (detail?.stats?.commissionRate ?? 0.1) * 100
                        ).toFixed(1)}%)`}
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!form.accepting_new_clients}
                          onCheckedChange={(v) => setForm({ ...form, accepting_new_clients: v })}
                          id="accepting"
                        />
                        <Label htmlFor="accepting" className="text-xs">
                          Accepting new clients
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!form.active}
                          onCheckedChange={(v) => setForm({ ...form, active: v })}
                          id="active"
                        />
                        <Label htmlFor="active" className="text-xs">
                          Active
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                        Save profile
                      </Button>
                    </div>
                  </div>
                </section>
              </TabsContent>

              {/* -------- Territories -------- */}
              <TabsContent value="territories" className="mt-4 space-y-3">
                {rep.territories.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm">
                    <div className="text-muted-foreground">
                      No territories yet. Auto-populate from this rep's signup area, or add one
                      manually below.
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => autoSetup.mutate()}
                        disabled={autoSetup.isPending}
                      >
                        <Zap className="mr-1 h-3 w-3" />
                        Auto-populate from signup area
                      </Button>
                      {detail?.account?.profile ? (
                        <span className="text-xs text-muted-foreground">
                          Signup area:{" "}
                          {[
                            detail.account.profile.signup_region ??
                              detail.account.profile.business_region,
                            detail.account.profile.signup_city ??
                              detail.account.profile.business_city,
                          ]
                            .filter(Boolean)
                            .join(" › ") || "not set"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <TerritoryEditor
                  repUserId={rep.user_id}
                  territories={rep.territories}
                  onChange={() => {
                    refetch();
                    detailQ.refetch();
                  }}
                />
              </TabsContent>

              {/* -------- Analytics -------- */}
              <TabsContent value="analytics" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Quick stats</h3>
                  <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last 365 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {detailQ.isLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <KpiCard label="Active accounts" value={detail?.stats?.activeAccounts ?? 0} />
                      <KpiCard label="Territories" value={detail?.stats?.territoriesCount ?? 0} />
                      <KpiCard label="Open follow-ups" value={detail?.stats?.openFollowups ?? 0} />
                      <KpiCard label="Signups (window)" value={detail?.stats?.signupsInWindow ?? 0} />
                      <KpiCard label="QR scans (window)" value={detail?.stats?.qrScans ?? 0} />
                      <KpiCard label="Redemptions (window)" value={detail?.stats?.redemptions ?? 0} />
                      <KpiCard
                        label="Revenue (window)"
                        value={`₱${formatMoney(detail?.stats?.revenuePhp ?? 0)}`}
                      />
                      <KpiCard
                        label="Est. commission (window)"
                        value={`₱${formatMoney(detail?.stats?.commissionPhpEstimated ?? 0)}`}
                        hint={`@ ${((detail?.stats?.commissionRate ?? 0.1) * 100).toFixed(1)}%`}
                      />
                      <KpiCard
                        label="Est. payout owed (lifetime)"
                        value={`₱${formatMoney(detail?.stats?.payoutOwedPhpEstimated ?? 0)}`}
                        hint="Est. — no payment tracking yet"
                      />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        Signups per week (window)
                      </div>
                      {(detail?.stats?.signupsByWeek ?? []).length === 0 ? (
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          No signups in this window.
                        </div>
                      ) : (
                        <WeeklyBars data={detail!.stats.signupsByWeek} />
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* -------- Referred users -------- */}
              <TabsContent value="referred" className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Lifetime spend & commission per user attributed to this rep via their referral
                    code.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportReferredCsv}
                    disabled={filteredReferred.length === 0}
                  >
                    <Download className="mr-1 h-3 w-3" /> Export CSV
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Search name, email, or ID…"
                    value={refSearch}
                    onChange={(e) => {
                      setRefSearch(e.target.value);
                      setRefPage(1);
                    }}
                    className="h-9 w-full sm:max-w-xs"
                  />
                  <Select
                    value={refFilter}
                    onValueChange={(v) => {
                      setRefFilter(v as any);
                      setRefPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="spend">With spend</SelectItem>
                      <SelectItem value="nospend">No spend</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={refSort} onValueChange={(v) => setRefSort(v as any)}>
                    <SelectTrigger className="h-9 w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission_desc">Commission (high → low)</SelectItem>
                      <SelectItem value="commission_asc">Commission (low → high)</SelectItem>
                      <SelectItem value="spent_desc">Spent (high → low)</SelectItem>
                      <SelectItem value="spent_asc">Spent (low → high)</SelectItem>
                      <SelectItem value="recent">Newest signup</SelectItem>
                      <SelectItem value="oldest">Oldest signup</SelectItem>
                      <SelectItem value="name">Name (A → Z)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(refPageSize)}
                    onValueChange={(v) => {
                      setRefPageSize(Number(v));
                      setRefPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {detailQ.isLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (detail?.referredUsers?.length ?? 0) === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <UsersIcon className="mx-auto mb-2 h-5 w-5 opacity-60" />
                    No referred users with tracked spend yet.
                  </div>
                ) : filteredReferred.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No users match the current search or filter.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Signed up</th>
                            <th className="px-3 py-2 text-right">Redemptions</th>
                            <th className="px-3 py-2 text-right">Spent</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">Commission</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedReferred.map((r: any) => (
                            <tr key={r.user_id} className="border-t align-top">
                              <td className="px-3 py-2">
                                <div className="font-medium">{r.name ?? "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {r.email ?? r.user_id.slice(0, 8)}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                {r.signed_up_at
                                  ? new Date(r.signed_up_at).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-right">{r.redemptions}</td>
                              <td className="px-3 py-2 text-right">₱{formatMoney(r.spent_php)}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                                {(r.commission_rate * 100).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                ₱{formatMoney(r.commission_php)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDrilldownUserId(r.user_id)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Details
                                  </button>
                                  <Link
                                    to="/admin/users"
                                    search={{ q: r.email ?? r.user_id } as any}
                                    className="inline-flex items-center text-xs text-muted-foreground hover:underline"
                                  >
                                    Profile <ExternalLink className="ml-1 h-3 w-3" />
                                  </Link>
                                </div>
                              </td>

                            </tr>
                          ))}
                          <tr className="border-t bg-muted/30 font-medium">
                            <td className="px-3 py-2" colSpan={3}>
                              Filtered totals ({filteredReferred.length} of{" "}
                              {detail?.referredUsers?.length ?? 0})
                            </td>
                            <td className="px-3 py-2 text-right">
                              ₱{formatMoney(filteredTotals.spent)}
                            </td>
                            <td></td>
                            <td className="px-3 py-2 text-right">
                              ₱{formatMoney(filteredTotals.commission)}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div>
                        Showing {(refCurrentPage - 1) * refPageSize + 1}–
                        {Math.min(refCurrentPage * refPageSize, filteredReferred.length)} of{" "}
                        {filteredReferred.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={refCurrentPage <= 1}
                          onClick={() => setRefPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <span>
                          Page {refCurrentPage} / {refTotalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={refCurrentPage >= refTotalPages}
                          onClick={() => setRefPage((p) => Math.min(refTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Commission and payout figures are estimates computed from the rep's rate override
                  (or the site-wide default). No paid/unpaid state is tracked yet.
                </p>
              </TabsContent>



              {/* -------- Connections -------- */}
              <TabsContent value="connections" className="mt-4 space-y-4">
                {detailQ.isLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ConnectionsPanel connections={detail!.connections} repUserId={rep.user_id} />
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </SheetContent>
    </Sheet>
    <ReferredUserDrilldown
      repUserId={rep?.user_id ?? null}
      userId={drilldownUserId}
      onClose={() => setDrilldownUserId(null)}
    />
    </>
  );
}

function ReferredUserDrilldown({
  repUserId,
  userId,
  onClose,
}: {
  repUserId: string | null;
  userId: string | null;
  onClose: () => void;
}) {
  const detailFn = useServerFn(adminGetReferredUserDetail);
  const q = useQuery({
    queryKey: ["admin-referred-user-detail", repUserId, userId],
    queryFn: () =>
      detailFn({ data: { rep_user_id: repUserId!, user_id: userId! } }),
    enabled: !!repUserId && !!userId,
  });
  const d = q.data;

  const exportCsv = () => {
    const rows = d?.transactions ?? [];
    if (!rows.length) return;
    const header = [
      "created_at",
      "kind",
      "applies_to",
      "referral_code",
      "promotion_code",
      "base_amount_php",
      "discount_amount_php",
      "final_amount_php",
      "commission_rate",
      "commission_php",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.created_at,
          r.kind,
          r.applies_to,
          r.referral_code,
          r.promotion?.code ?? "",
          r.base_amount_php,
          r.discount_amount_php,
          r.final_amount_php,
          d?.commission.rate ?? "",
          r.commission_php,
        ]
          .map((v) => {
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referred-user-${userId ?? "user"}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {!userId ? null : q.isLoading || !d ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{d.user.name ?? d.user.email ?? "Referred user"}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {d.user.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {d.user.email}
                  </span>
                )}
                {d.user.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {d.user.phone}
                  </span>
                )}
                {(d.user.city || d.user.region) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[d.user.city, d.user.region].filter(Boolean).join(", ")}
                  </span>
                )}
                {d.user.signed_up_at && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Joined {new Date(d.user.signed_up_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Commission split card */}
              <div className="rounded-md border p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Commission split
                </div>
                <div className="flex flex-wrap items-baseline gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Applied rate</div>
                    <div className="text-lg font-semibold">
                      {(d.commission.rate * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className="text-sm">
                      {d.commission.override_active ? (
                        <Badge variant="secondary">Rep override</Badge>
                      ) : (
                        <Badge variant="outline">Site default</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Site default</div>
                    <div className="text-sm">
                      {(d.commission.site_default_rate * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Commission per transaction = final amount × applied rate. Estimates only; no
                  paid/unpaid state is tracked yet.
                </p>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KpiCard label="Transactions" value={d.totals.transactions} />
                <KpiCard label="Total spent" value={`₱${formatMoney(d.totals.spent_php)}`} />
                <KpiCard
                  label="Total discount"
                  value={`₱${formatMoney(d.totals.discount_php)}`}
                />
                <KpiCard
                  label="Commission"
                  value={`₱${formatMoney(d.totals.commission_php)}`}
                />
              </div>

              {/* Category breakdown */}
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Spend categories
                </div>
                {d.categories.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No categories yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2 text-right">Count</th>
                          <th className="px-3 py-2 text-right">Spent</th>
                          <th className="px-3 py-2 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.categories.map((c) => (
                          <tr key={c.kind} className="border-t">
                            <td className="px-3 py-2 capitalize">{c.kind.replace(/_/g, " ")}</td>
                            <td className="px-3 py-2 text-right">{c.count}</td>
                            <td className="px-3 py-2 text-right">₱{formatMoney(c.spent_php)}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              ₱{formatMoney(c.commission_php)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Transactions ({d.transactions.length})
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportCsv}
                    disabled={d.transactions.length === 0}
                  >
                    <Download className="mr-1 h-3 w-3" /> Export CSV
                  </Button>
                </div>
                {d.transactions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No transactions on this rep's referral codes yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Code</th>
                          <th className="px-3 py-2 text-right">Base</th>
                          <th className="px-3 py-2 text-right">Discount</th>
                          <th className="px-3 py-2 text-right">Final</th>
                          <th className="px-3 py-2 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.transactions.map((t) => (
                          <tr key={t.id} className="border-t align-top">
                            <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2">
                              <div className="capitalize">{t.kind.replace(/_/g, " ")}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {t.applies_to.replace(/_/g, " ")}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-mono text-xs">{t.referral_code}</div>
                              {t.promotion?.code && (
                                <div className="text-[11px] text-muted-foreground">
                                  promo {t.promotion.code} (
                                  {t.promotion.percent_off.toFixed(0)}%)
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ₱{formatMoney(t.base_amount_php)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                              −₱{formatMoney(t.discount_amount_php)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ₱{formatMoney(t.final_amount_php)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              ₱{formatMoney(t.commission_php)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/30 font-medium">
                          <td className="px-3 py-2" colSpan={3}>
                            Totals
                          </td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-xs">
                            −₱{formatMoney(d.totals.discount_php)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ₱{formatMoney(d.totals.spent_php)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ₱{formatMoney(d.totals.commission_php)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <Link
                  to="/admin/users"
                  search={{ q: d.user.email ?? d.user.id } as any}
                  className="inline-flex items-center text-xs text-primary hover:underline"
                >
                  Open full user profile <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}


function formatMoney(n: number): string {
  return Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function AccountCard({
  detail,
  loading,
  rep,
}: {
  detail: any;
  loading: boolean;
  rep: Rep;
}) {
  const acct = detail?.account;
  const p = acct?.profile ?? rep.profile ?? {};
  const city = p.signup_city ?? p.business_city ?? null;
  const region = p.signup_region ?? p.business_region ?? null;
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs font-medium text-muted-foreground">Account</div>
      {loading && !acct ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {acct?.email || rep.email || "—"}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {acct?.phone || p.phone_e164 || p.phone || "—"}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {[city, region].filter(Boolean).join(", ") || "—"}
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            Joined:{" "}
            {acct?.created_at ? new Date(acct.created_at).toLocaleDateString() : "—"}
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            Last sign-in:{" "}
            {acct?.last_sign_in_at
              ? new Date(acct.last_sign_in_at).toLocaleString()
              : "—"}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              search={{ q: acct?.email ?? rep.email } as any}
              className="inline-flex items-center text-xs text-primary hover:underline"
            >
              Open in admin/users <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutBreakdown({ detail, loading }: { detail: any; loading: boolean }) {
  const s = detail?.stats;
  if (loading && !s) {
    return (
      <div className="rounded-md border p-3 text-xs text-muted-foreground">
        <Loader2 className="mr-2 inline h-3 w-3 animate-spin" /> Loading payout breakdown…
      </div>
    );
  }
  if (!s) return null;

  const rate: number = Number(s.commissionRate ?? 0.1);
  const overrideActive = !!s.commissionRateOverrideActive;
  const siteDefault: number = Number(s.commissionRateSiteDefault ?? 0.1);
  const paid = Number(s.payoutPaidPhp ?? 0);
  const owed = Number(s.payoutOwedPhpEstimated ?? 0);
  const commissionTotal = Number(s.lifetimeCommissionPhpEstimated ?? 0);
  const users: any[] = detail?.referredUsers ?? [];
  const topUsers = [...users]
    .sort((a, b) => Number(b.commission_php) - Number(a.commission_php))
    .slice(0, 10);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Payout breakdown</h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Rate</span>
          <Badge variant={overrideActive ? "secondary" : "outline"}>
            {(rate * 100).toFixed(2)}% {overrideActive ? "(override)" : "(site default)"}
          </Badge>
          {overrideActive && (
            <span>site default {(siteDefault * 100).toFixed(2)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiCard
          label="Lifetime referred revenue"
          value={`₱${formatMoney(s.lifetimeSpentPhp ?? 0)}`}
          hint={`${s.lifetimeRedemptions ?? 0} redemptions · ${s.lifetimeReferredUsers ?? 0} users`}
        />
        <KpiCard
          label="Discounts given"
          value={`₱${formatMoney(s.lifetimeDiscountPhp ?? 0)}`}
          hint="Total off through this rep's codes"
        />
        <KpiCard
          label="Commission earned"
          value={`₱${formatMoney(commissionTotal)}`}
          hint={`Revenue × ${(rate * 100).toFixed(2)}%`}
        />
        <KpiCard label="Amount paid" value={`₱${formatMoney(paid)}`} hint="Recorded payouts" />
        <KpiCard
          label="Outstanding balance"
          value={`₱${formatMoney(owed)}`}
          hint="Owed to rep"
        />
        <KpiCard
          label="This window revenue"
          value={`₱${formatMoney(s.revenuePhp ?? 0)}`}
          hint={`Last ${s.days ?? 30}d · commission ₱${formatMoney(
            s.commissionPhpEstimated ?? 0,
          )}`}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2 text-right">Redemptions</th>
              <th className="px-3 py-2 text-right">Spent</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Commission</th>
              <th className="px-3 py-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No referred users with tracked spend yet.
                </td>
              </tr>
            ) : (
              topUsers.map((u) => {
                const share =
                  commissionTotal > 0 ? (Number(u.commission_php) / commissionTotal) * 100 : 0;
                return (
                  <tr key={u.user_id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email ?? u.user_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{u.redemptions}</td>
                    <td className="px-3 py-2 text-right">₱{formatMoney(u.spent_php)}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {(Number(u.commission_rate) * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₱{formatMoney(u.commission_php)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="border-t bg-muted/30 font-medium">
              <td className="px-3 py-2">
                Totals {users.length > topUsers.length ? `(top ${topUsers.length} of ${users.length})` : ""}
              </td>
              <td></td>
              <td className="px-3 py-2 text-right">
                ₱{formatMoney(s.lifetimeSpentPhp ?? 0)}
              </td>
              <td></td>
              <td className="px-3 py-2 text-right">₱{formatMoney(commissionTotal)}</td>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Commission ={" "}
        <span className="font-mono">final_amount × {(rate * 100).toFixed(2)}%</span>. Amount paid
        is 0 until a payouts table is introduced; outstanding balance equals total commission
        earned. Figures are estimates.
      </p>
    </section>
  );
}



function WeeklyBars({ data }: { data: { weekStart: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.weekStart} className="flex items-center gap-2 text-xs">
          <div className="w-20 text-muted-foreground">{d.weekStart}</div>
          <div className="h-2 flex-1 rounded bg-muted">
            <div
              className="h-2 rounded bg-primary"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <div className="w-6 text-right tabular-nums">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

function ConnectionsPanel({
  connections,
  repUserId,
}: {
  connections: any;
  repUserId: string;
}) {
  const bizList = connections.businesses_owned ?? [];
  const clubList = connections.clubs_owned ?? [];
  const audit = connections.recent_admin_audit ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Businesses owned" value={bizList.length} />
        <KpiCard label="Listings" value={connections.listings_count ?? 0} />
        <KpiCard label="Clubs owned" value={clubList.length} />
        <KpiCard label="Open tickets" value={connections.open_support_tickets ?? 0} />
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4" /> Businesses
        </div>
        {bizList.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            None.
          </div>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {bizList.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.status}</div>
                </div>
                {b.slug ? (
                  <Link
                    to="/businesses/$slug"
                    params={{ slug: b.slug } as any}
                    className="inline-flex items-center text-xs text-primary hover:underline"
                  >
                    Open <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Store className="h-4 w-4" /> Clubs
        </div>
        {clubList.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            None.
          </div>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {clubList.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <LifeBuoy className="h-4 w-4" /> Partner program
        </div>
        {connections.partner_program ? (
          <div className="rounded-md border p-3 text-sm">
            <div>Status: {connections.partner_program.status ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              Joined:{" "}
              {connections.partner_program.created_at
                ? new Date(connections.partner_program.created_at).toLocaleDateString()
                : "—"}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Not a partner-program partner.
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" /> Recent admin audit
        </div>
        {audit.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            None.
          </div>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {audit.map((a: any) => (
              <li key={a.id} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                {a.note ? <div className="text-xs text-muted-foreground">{a.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2">
          <Link
            to="/admin/audit"
            search={{ q: repUserId } as any}
            className="inline-flex items-center text-xs text-primary hover:underline"
          >
            View full audit <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}


/* -------------------- Audit Log Tab -------------------- */

const ACTION_LABEL: Record<string, string> = {
  assign: "Assigned",
  reassign: "Reassigned",
  unassign: "Unassigned",
  territory_add: "Territory added",
  territory_remove: "Territory removed",
  bulk_territory_assign: "Bulk auto-assign",
};

function AuditTab() {
  const { data: repsData } = useReps();
  const reps: Rep[] = repsData?.reps ?? [];
  const [filters, setFilters] = useState<{
    rep_user_id?: string;
    action?:
      | "assign"
      | "reassign"
      | "unassign"
      | "territory_add"
      | "territory_remove"
      | "bulk_territory_assign";
  }>({});
  const fn = useServerFn(adminListAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-sales-audit", filters],
    queryFn: () => fn({ data: filters }),
  });
  const rows = data?.entries ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Rep</Label>
          <Select
            value={filters.rep_user_id ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, rep_user_id: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reps</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.user_id} value={r.user_id}>
                  {repName(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Action</Label>
          <Select
            value={filters.action ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, action: v === "all" ? undefined : (v as any) }))
            }
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any action</SelectItem>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2">Subject / Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  <History className="mx-auto mb-2 h-5 w-5 opacity-60" />
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              rows.map((e: any) => {
                const when = new Date(e.created_at);
                const actor = e.actor?.name || e.actor?.email || "—";
                const repLbl =
                  e.action === "reassign" && e.prev_rep_name
                    ? `${e.prev_rep_name ?? "—"} → ${e.rep_name ?? "—"}`
                    : e.rep_name ?? "—";
                const subj = e.subject as any;
                const subjLbl =
                  e.action.startsWith("territory")
                    ? [e.details?.region, e.details?.province, e.details?.city]
                        .filter(Boolean)
                        .join(" › ")
                    : e.action === "bulk_territory_assign"
                      ? `${e.details?.assigned ?? 0} account(s) auto-assigned`
                      : subj?.name
                        ? `${subj.name}${e.subject_type === "business" ? " (business)" : ""}`
                        : e.subject_id
                          ? e.subject_id.slice(0, 8)
                          : "—";
                return (
                  <tr key={e.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {when.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{actor}</div>
                      {e.actor?.email && e.actor?.name ? (
                        <div className="text-xs text-muted-foreground">{e.actor.email}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{ACTION_LABEL[e.action] ?? e.action}</Badge>
                    </td>
                    <td className="px-3 py-2">{repLbl}</td>
                    <td className="px-3 py-2">{subjLbl}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
