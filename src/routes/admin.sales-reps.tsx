import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Trash2, UserCog, X, Zap, History } from "lucide-react";
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

  const [form, setForm] = useState<any>({});

  // Sync form when rep loads
  const [lastId, setLastId] = useState<string | null>(null);
  if (rep && lastId !== rep.user_id) {
    setLastId(rep.user_id);
    setForm({
      title: rep.rep_profile?.title ?? "",
      bio: rep.rep_profile?.bio ?? "",
      public_email: rep.rep_profile?.public_email ?? "",
      public_phone: rep.rep_profile?.public_phone ?? "",
      photo_url: rep.rep_profile?.photo_url ?? "",
      accepting_new_clients: rep.rep_profile?.accepting_new_clients ?? true,
      active: rep.rep_profile?.active ?? true,
    });
  }

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          rep_user_id: rep!.user_id,
          title: form.title || null,
          bio: form.bio || null,
          public_email: form.public_email || null,
          public_phone: form.public_phone || null,
          photo_url: form.photo_url || null,
          accepting_new_clients: !!form.accepting_new_clients,
          active: !!form.active,
        },
      }),
    onSuccess: () => { toast.success("Saved"); refetch(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Sheet open={!!repUserId} onOpenChange={(o) => !o && (setLastId(null), onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {rep ? (
          <>
            <SheetHeader>
              <SheetTitle>{repName(rep)}</SheetTitle>
              <p className="text-xs text-muted-foreground">{rep.email}</p>
            </SheetHeader>

            <div className="mt-4 space-y-6">
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
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!form.accepting_new_clients}
                        onCheckedChange={(v) => setForm({ ...form, accepting_new_clients: v })}
                        id="accepting"
                      />
                      <Label htmlFor="accepting" className="text-xs">Accepting new clients</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!form.active}
                        onCheckedChange={(v) => setForm({ ...form, active: v })}
                        id="active"
                      />
                      <Label htmlFor="active" className="text-xs">Active</Label>
                    </div>
                  </div>
                  <div>
                    <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                      Save profile
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Territories</h3>
                <TerritoryEditor
                  repUserId={rep.user_id}
                  territories={rep.territories}
                  onChange={refetch}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Quick stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="Active accounts" value={rep.active_accounts} />
                  <KpiCard label="Territories" value={rep.territories.length} />
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
