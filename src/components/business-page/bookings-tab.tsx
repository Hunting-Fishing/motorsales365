import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  CalendarDays,
  List,
  RefreshCcw,
  UserRound,
  ExternalLink,
  Clock,
  CheckCircle2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  upsertBookableItem,
  deleteBookableItem,
  replaceWeeklyAvailability,
  upsertException,
  deleteException,
  updateBookingStatus,
  assignBooking,
  listBookingAssignees,
} from "@/lib/business-bookings.functions";
import {
  isStructuredHours,
  DAY_KEYS,
  DAY_LABELS,
  formatRange,
  type StructuredHours,
} from "@/lib/business-hours";
import { formatE164 } from "@/data/country-codes";
import { TAG_GROUPS } from "@/data/service-tags";
import { cn } from "@/lib/utils";

const BOOKABLE_CATALOG_GROUPS = ["repair", "body", "wash", "salvage"] as const;

// Per business-kind, which TAG_GROUPS keys are the "primary" catalog the
// owner should see first in "+ Select from catalog". Everything else from
// the BOOKABLE_CATALOG_GROUPS pool moves under "+ Extras".
const PRIMARY_CATALOG_BY_KIND: Record<string, readonly string[]> = {
  repair_shop: ["repair"],
  motorcycle_shop: ["repair"],
  tire_shop: ["repair"],
  battery_shop: ["repair"],
  towing: ["repair"],
  body_paint: ["body"],
  carwash: ["wash"],
  salvage: ["salvage"],
  parts_accessories: ["salvage"],
  inspection: ["repair"],
  accessories: ["body"],
  audio_tint: ["body"],
};

// Extra hand-curated rows per kind that aren't in TAG_GROUPS but make sense
// as bookable services. Alphabetized at render.
const EXTRA_CATALOG_BY_KIND: Record<string, string[]> = {
  towing: [
    "Flatbed tow",
    "Wheel-lift tow",
    "Heavy-duty tow",
    "Motorcycle tow",
    "Accident recovery",
    "Winch-out",
    "Lockout assistance",
    "Battery jump-start",
    "Fuel delivery",
    "Tire change (roadside)",
  ],
  tire_shop: [
    "Vulcanizing (patch)",
    "Nitrogen fill",
    "Tire rotation",
    "Tubeless conversion",
    "Mobile fitting",
  ],
  battery_shop: ["Battery delivery & install", "Free battery testing", "Trade-in"],
  motorcycle_shop: ["Motorcycle PMS", "Motorcycle tune-up", "Chain & sprocket service"],
  fuel_station: ["EV charging session"],
  inspection: ["Pre-purchase inspection (PPI)", "OBD scan", "Smoke / emissions test"],
  driving_school: ["TDC (theory)", "PDC (practical)", "Refresher course", "Private lesson"],
  lto_services: ["LTO renewal assist", "Plate pickup", "Stencil"],
  audio_tint: ["Window tint install", "Dashcam install", "Head unit install"],
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  completed: "bg-slate-400",
  cancelled: "bg-rose-500",
  no_show: "bg-zinc-400",
};

type CatalogRow = { title: string; groupLabel: string };

function buildCatalogs(kind?: string | null): { primary: CatalogRow[]; extras: CatalogRow[] } {
  const primaryKeys = (kind && PRIMARY_CATALOG_BY_KIND[kind]) || [];
  const primarySet = new Set<string>();
  const primary: CatalogRow[] = [];

  // Curated extras first (most relevant to this kind)
  const curated = (kind && EXTRA_CATALOG_BY_KIND[kind]) || [];
  for (const t of curated) {
    if (!primarySet.has(t)) {
      primarySet.add(t);
      primary.push({ title: t, groupLabel: "Common for your business" });
    }
  }

  // Then matching TAG_GROUPS
  for (const g of TAG_GROUPS) {
    if (!primaryKeys.includes(g.key)) continue;
    for (const t of [...g.tags].sort((a, b) => a.localeCompare(b))) {
      if (primarySet.has(t)) continue;
      primarySet.add(t);
      primary.push({ title: t, groupLabel: g.label });
    }
  }

  // Extras = everything else in BOOKABLE_CATALOG_GROUPS not already in primary
  const extras: CatalogRow[] = [];
  for (const g of TAG_GROUPS) {
    if (!(BOOKABLE_CATALOG_GROUPS as readonly string[]).includes(g.key)) continue;
    if (primaryKeys.includes(g.key)) continue;
    for (const t of [...g.tags].sort((a, b) => a.localeCompare(b))) {
      if (primarySet.has(t)) continue;
      extras.push({ title: t, groupLabel: g.label });
    }
  }

  // If no kind-specific primary, fall back: everything is primary, no extras.
  if (primary.length === 0) {
    const all: CatalogRow[] = [];
    for (const g of TAG_GROUPS) {
      if (!(BOOKABLE_CATALOG_GROUPS as readonly string[]).includes(g.key)) continue;
      for (const t of [...g.tags].sort((a, b) => a.localeCompare(b))) {
        all.push({ title: t, groupLabel: g.label });
      }
    }
    return { primary: all, extras: [] };
  }

  return { primary, extras };
}

function groupRows(rows: CatalogRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.groupLabel] ||= []).push(r.title);
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.localeCompare(b));
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Item = any;
type Avail = { weekday: number; start_time: string; end_time: string };
type Exc = any;
type Booking = any;
type Assignee = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  title: string | null;
};

export function BookingsTab({
  businessId,
  businessSlug,
  businessName,
  businessKind,
  businessHours,
  items,
  availability,
  exceptions,
  bookings,
  onChange,
}: {
  businessId: string;
  businessSlug?: string | null;
  businessName?: string;
  businessKind?: string | null;
  businessHours: unknown;
  items: Item[];
  availability: Avail[];
  exceptions: Exc[];
  bookings: Booking[];
  onChange: () => void;
}) {
  const fetchAssignees = useServerFn(listBookingAssignees);
  const { data: assigneeData } = useQuery({
    queryKey: ["booking-assignees", businessId],
    queryFn: () => fetchAssignees({ data: { businessId } }),
  });
  const assignees: Assignee[] = (assigneeData as any)?.assignees ?? [];

  const pending = bookings.filter((b: any) => b.status === "pending").length;
  const confirmed = bookings.filter((b: any) => b.status === "confirmed").length;
  const hasItems = items.length > 0;

  return (
    <div className="space-y-6">
      {/* Slim overview banner */}
      <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-display text-base font-semibold">Online bookings</h2>
            <Badge variant="secondary" className="text-[10px]">
              {hasItems ? `${items.length} service${items.length === 1 ? "" : "s"}` : "0 services"}
            </Badge>
            <Badge variant={pending ? "destructive" : "outline"} className="text-[10px]">
              {pending} pending
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {confirmed} confirmed
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Bookings respect your <strong>Hours</strong> tab — change open hours there and they flow through automatically.
          </p>
        </div>
        {businessSlug && (
          <div className="flex flex-col items-end gap-1">
            {hasItems && (
              <Link
                to="/businesses/$slug/book"
                params={{ slug: businessSlug }}
                target="_blank"
                rel="noopener"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Preview public page
                </Button>
              </Link>
            )}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              /businesses/{businessSlug}/book
            </code>
          </div>
        )}
      </Card>

      <BookableItemsSection businessId={businessId} businessKind={businessKind} items={items} onChange={onChange} />
      <WeeklyHoursSection
        businessId={businessId}
        businessHours={businessHours}
        availability={availability}
        onChange={onChange}
      />
      <ExceptionsSection businessId={businessId} exceptions={exceptions} onChange={onChange} />
      <BookingsInboxSection
        businessId={businessId}
        businessName={businessName}
        bookings={bookings}
        assignees={assignees}
        onChange={onChange}
      />
    </div>
  );
}

/* ---------- Items ---------- */

const emptyItem = {
  title: "",
  description: "",
  duration_min: 30,
  buffer_min: 10,
  price_php: null as number | null,
  max_concurrent: 1,
  require_approval: true,
  lead_time_hours: 2,
  horizon_days: 30,
  active: true,
};

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-muted-foreground">{children}</p>;
}

function BookableItemsSection({
  businessId,
  businessKind,
  items,
  onChange,
}: {
  businessId: string;
  businessKind?: string | null;
  items: Item[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertBookableItem);
  const remove = useServerFn(deleteBookableItem);
  const [draft, setDraft] = useState<any | null>(null);
  const { primary, extras } = useMemo(() => buildCatalogs(businessKind), [businessKind]);
  const primaryGrouped = useMemo(() => groupRows(primary), [primary]);
  const extrasGrouped = useMemo(() => groupRows(extras), [extras]);

  async function save() {
    if (!draft.title?.trim()) return toast.error("Title is required");
    try {
      await upsert({
        data: {
          businessId,
          id: draft.id,
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          duration_min: Number(draft.duration_min),
          buffer_min: Number(draft.buffer_min ?? 0),
          price_php:
            draft.price_php != null && draft.price_php !== "" ? Number(draft.price_php) : null,
          max_concurrent: Number(draft.max_concurrent ?? 1),
          require_approval: !!draft.require_approval,
          lead_time_hours: Number(draft.lead_time_hours ?? 2),
          horizon_days: Number(draft.horizon_days ?? 30),
          active: draft.active !== false,
        },
      });
      toast.success("Service saved");
      setDraft(null);
      onChange();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  }

  async function del(id: string) {
    if (!(await confirm({ title: "Delete this bookable service?", destructive: true }))) return;
    try {
      await remove({ data: { businessId, id } });
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function toggleActive(it: Item) {
    try {
      await upsert({
        data: {
          businessId,
          id: it.id,
          title: it.title,
          description: it.description ?? null,
          duration_min: it.duration_min,
          buffer_min: it.buffer_min ?? 0,
          price_php: it.price_php ?? null,
          max_concurrent: it.max_concurrent ?? 1,
          require_approval: !!it.require_approval,
          lead_time_hours: it.lead_time_hours ?? 2,
          horizon_days: it.horizon_days ?? 30,
          active: !it.active,
        },
      });
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  function startFromCatalog(title: string) {
    setDraft({ ...emptyItem, title });
  }

  return (
    <Card className="px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">Bookable services</h2>
          <p className="text-xs text-muted-foreground">
            Pick from the catalog or add your own. Click a row to edit details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value="" onValueChange={(v) => v && startFromCatalog(v)}>
            <SelectTrigger className="h-8 w-[230px] text-xs">
              <SelectValue placeholder="+ Select from catalog" />
            </SelectTrigger>
            <SelectContent className="max-h-[360px]">
              {Object.keys(primaryGrouped).length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No catalog matched. Use + Extras or + Add manually.
                </div>
              ) : (
                Object.keys(primaryGrouped)
                  .sort((a, b) => a.localeCompare(b))
                  .map((groupLabel) => (
                    <SelectGroup key={groupLabel}>
                      <SelectLabel>{groupLabel}</SelectLabel>
                      {primaryGrouped[groupLabel].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
              )}
            </SelectContent>
          </Select>

          {extras.length > 0 && (
            <Select value="" onValueChange={(v) => v && startFromCatalog(v)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="+ Extras (master list)" />
              </SelectTrigger>
              <SelectContent className="max-h-[360px]">
                {Object.keys(extrasGrouped)
                  .sort((a, b) => a.localeCompare(b))
                  .map((groupLabel) => (
                    <SelectGroup key={groupLabel}>
                      <SelectLabel>{groupLabel}</SelectLabel>
                      {extrasGrouped[groupLabel].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Button size="sm" onClick={() => setDraft({ ...emptyItem })}>
            <Plus className="mr-1 h-4 w-4" /> Add manually
          </Button>
        </div>
      </div>


      <TableScroll minWidth="640px">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Service</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Buffer</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Max/slot</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No bookable services yet — use the buttons above to add one.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow
                  key={it.id}
                  className="cursor-pointer"
                  onClick={() => setDraft(it)}
                >
                  <TableCell className="font-medium">
                    <div className="truncate">{it.title}</div>
                    {it.description && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {it.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{it.duration_min}m</TableCell>
                  <TableCell className="text-xs">{it.buffer_min ?? 0}m</TableCell>
                  <TableCell className="text-xs">{it.lead_time_hours ?? 0}h</TableCell>
                  <TableCell className="text-xs">{it.max_concurrent ?? 1}</TableCell>
                  <TableCell className="text-xs">
                    {it.price_php != null ? `₱${it.price_php.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={it.active ? "default" : "secondary"} className="text-[10px]">
                      {it.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft(it)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(it)}
                        aria-label={it.active ? "Disable" : "Enable"}
                        title={it.active ? "Disable" : "Enable"}
                      >
                        <CheckCircle2
                          className={cn(
                            "h-4 w-4",
                            it.active ? "text-emerald-500" : "text-muted-foreground",
                          )}
                        />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(it.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableScroll>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit service" : "New bookable service"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Basics
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Service title *</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      maxLength={120}
                      placeholder="e.g. Oil change, Tow request, Vehicle inspection"
                    />
                    <FieldHelp>What customers will see on the booking page.</FieldHelp>
                  </div>
                  <div>
                    <Label>Price (PHP, optional)</Label>
                    <Input
                      type="number"
                      value={draft.price_php ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          price_php: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Leave blank for quote-on-request"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <Label className="m-0">Active</Label>
                    <Switch
                      checked={draft.active !== false}
                      onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={draft.description ?? ""}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      rows={2}
                      maxLength={1000}
                      placeholder="What's included, what to bring, etc."
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scheduling rules
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min={5}
                      value={draft.duration_min}
                      onChange={(e) => setDraft({ ...draft, duration_min: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Buffer between bookings (min)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.buffer_min}
                      onChange={(e) => setDraft({ ...draft, buffer_min: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Max concurrent</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.max_concurrent}
                      onChange={(e) =>
                        setDraft({ ...draft, max_concurrent: Number(e.target.value) })
                      }
                    />
                    <FieldHelp>How many customers you can serve at once.</FieldHelp>
                  </div>
                  <div>
                    <Label>Lead time (hours)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.lead_time_hours}
                      onChange={(e) =>
                        setDraft({ ...draft, lead_time_hours: Number(e.target.value) })
                      }
                    />
                    <FieldHelp>Minimum notice before a booking can start.</FieldHelp>
                  </div>
                  <div>
                    <Label>Booking horizon (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.horizon_days}
                      onChange={(e) =>
                        setDraft({ ...draft, horizon_days: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <Label className="m-0">Require approval</Label>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.require_approval ? "Manual confirm" : "Auto-confirms"}
                      </p>
                    </div>
                    <Switch
                      checked={!!draft.require_approval}
                      onCheckedChange={(v) => setDraft({ ...draft, require_approval: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>{draft?.id ? "Update service" : "Create service"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------- Weekly Hours ---------- */

const DAY_KEY_TO_WEEKDAY: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function hoursToAvailabilityRows(hours: unknown): Avail[] {
  if (!isStructuredHours(hours)) return [];
  const week = (hours as StructuredHours).primary;
  const rows: Avail[] = [];
  for (const key of DAY_KEYS) {
    const day = week[key];
    const wd = DAY_KEY_TO_WEEKDAY[key];
    if (!day || day.mode === "closed") continue;
    if (day.mode === "24h") {
      rows.push({ weekday: wd, start_time: "00:00", end_time: "23:59" });
      continue;
    }
    for (const r of day.ranges ?? []) {
      if (r?.open && r?.close && r.close > r.open) {
        rows.push({ weekday: wd, start_time: r.open, end_time: r.close });
      }
    }
  }
  return rows.sort((a, b) =>
    a.weekday === b.weekday ? a.start_time.localeCompare(b.start_time) : a.weekday - b.weekday,
  );
}

function rowsEqual(a: Avail[], b: Avail[]): boolean {
  if (a.length !== b.length) return false;
  const norm = (xs: Avail[]) =>
    [...xs]
      .map((r) => `${r.weekday}|${r.start_time}|${r.end_time}`)
      .sort()
      .join(",");
  return norm(a) === norm(b);
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ap}`;
}

function WeeklyHoursSection({
  businessId,
  businessHours,
  availability,
  onChange,
}: {
  businessId: string;
  businessHours: unknown;
  availability: Avail[];
  onChange: () => void;
}) {
  const replace = useServerFn(replaceWeeklyAvailability);

  const businessRows = useMemo(() => hoursToAvailabilityRows(businessHours), [businessHours]);
  const hasBusinessHours = businessRows.length > 0;

  const initiallySynced =
    hasBusinessHours &&
    (availability.length === 0 || rowsEqual(availability, businessRows));

  const [useBusinessHours, setUseBusinessHours] = useState<boolean>(initiallySynced);
  const [rows, setRows] = useState<Avail[]>(initiallySynced ? businessRows : availability);
  const [saving, setSaving] = useState(false);

  const effectiveRows = useBusinessHours ? businessRows : rows;

  async function save() {
    setSaving(true);
    try {
      await replace({ data: { businessId, rows: effectiveRows } });
      toast.success("Booking hours saved");
      onChange();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addRow(weekday: number) {
    setRows([...rows, { weekday, start_time: "09:00", end_time: "17:00" }]);
  }

  function resyncFromBusinessHours() {
    setRows(businessRows);
    toast.success("Pulled in your current open hours — fine-tune below if needed.");
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Booking hours</h2>
          <p className="text-xs text-muted-foreground">
            {useBusinessHours
              ? "Live-synced from your Hours tab. Edit there to update both."
              : !hasBusinessHours
                ? "Set your weekly open windows for online bookings."
                : "Custom booking hours — independent of your shop open hours."}
          </p>
        </div>
        {hasBusinessHours && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
            <CheckCircle2
              className={cn(
                "h-4 w-4",
                useBusinessHours ? "text-green-600" : "text-muted-foreground",
              )}
            />
            <Label htmlFor="use-business-hours" className="m-0 cursor-pointer text-xs">
              Use my business open hours
            </Label>
            <Switch
              id="use-business-hours"
              checked={useBusinessHours}
              onCheckedChange={(v) => {
                setUseBusinessHours(v);
                if (!v) setRows(businessRows);
              }}
            />
          </div>
        )}
      </div>

      {!hasBusinessHours && (
        <div className="mb-3 mt-3 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          You haven't set business open hours yet. Set them in the <strong>Hours</strong> tab to
          enable one-click sync between your shop hours and booking availability.
        </div>
      )}

      {/* Compact summary from Hours tab */}
      {hasBusinessHours && isStructuredHours(businessHours) && (
        <div className="mb-4 mt-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            From your Hours tab
          </div>
          <div className="grid gap-1 text-xs sm:grid-cols-2">
            {DAY_KEYS.map((k) => {
              const d = (businessHours as StructuredHours).primary[k];
              const label =
                !d || d.mode === "closed"
                  ? "Closed"
                  : d.mode === "24h"
                    ? "24 hours"
                    : (d.ranges ?? []).map((r) => formatRange(r)).join(", ") || "Closed";
              return (
                <div key={k} className="flex justify-between gap-2">
                  <span className="font-medium">{DAY_LABELS[k]}</span>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!useBusinessHours && hasBusinessHours && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={resyncFromBusinessHours}>
            <RefreshCcw className="mr-1 h-3 w-3" /> Re-sync from Hours
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {WEEKDAYS.map((name, idx) => {
          const dayRows = effectiveRows
            .map((r, i) => ({ r, i }))
            .filter((x) => x.r.weekday === idx);
          return (
            <div
              key={idx}
              className={cn(
                "rounded-md border p-3 transition-colors",
                dayRows.length === 0 ? "border-border bg-muted/20" : "border-border",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">{name}</div>
                {!useBusinessHours && (
                  <Button size="sm" variant="ghost" onClick={() => addRow(idx)}>
                    <Plus className="mr-1 h-3 w-3" /> Window
                  </Button>
                )}
              </div>
              {dayRows.length === 0 ? (
                <div className="text-xs text-muted-foreground">Closed</div>
              ) : (
                <div className="space-y-2">
                  {dayRows.map(({ r, i }) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        value={r.start_time}
                        disabled={useBusinessHours}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...r, start_time: e.target.value };
                          setRows(next);
                        }}
                        className="h-9 w-32"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={r.end_time}
                        disabled={useBusinessHours}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...r, end_time: e.target.value };
                          setRows(next);
                        }}
                        className="h-9 w-32"
                      />
                      {useBusinessHours && (
                        <span className="text-[11px] text-muted-foreground">
                          ({fmt12(r.start_time)} – {fmt12(r.end_time)})
                        </span>
                      )}
                      {!useBusinessHours && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {useBusinessHours
            ? "Saves a snapshot to your booking schedule. Re-save after editing Hours."
            : "These hours control when slots appear on your public booking page."}
        </p>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save booking hours"}
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Exceptions ---------- */

function ExceptionsSection({
  businessId,
  exceptions,
  onChange,
}: {
  businessId: string;
  exceptions: Exc[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertException);
  const remove = useServerFn(deleteException);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"closed_all" | "block_range" | "open_range">("closed_all");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");

  async function add() {
    if (!date) return toast.error("Pick a date");
    const payload: any = { businessId, date, note: note || null };
    if (mode === "closed_all") {
      payload.closed = true;
      payload.start_time = null;
      payload.end_time = null;
    } else {
      if (!startTime || !endTime || endTime <= startTime) {
        toast.error("End time must be after start time.");
        return;
      }
      payload.closed = mode === "block_range";
      payload.start_time = startTime;
      payload.end_time = endTime;
    }
    try {
      await upsert({ data: payload });
      setDate("");
      setNote("");
      onChange();
      toast.success("Date override added");
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">Holidays &amp; date overrides</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Close a full day, block part of a day, or open a special window for one date — perfect for
        holidays, lunch breaks, or one-off events.
      </p>
      <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
        <div className="grid gap-2 sm:grid-cols-[auto,auto,1fr,auto] sm:items-end">
          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="closed_all">Closed all day</option>
              <option value="block_range">Block time range</option>
              <option value="open_range">Open only this range</option>
            </select>
          </div>
          {mode !== "closed_all" && (
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 w-28"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 w-28"
                />
              </div>
            </div>
          )}
          <div className={mode === "closed_all" ? "sm:col-span-2" : ""}>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Holiday, staff training, etc."
              maxLength={200}
              className="h-9"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-3 w-3" /> Add override
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {exceptions.map((e) => {
          const hasRange = !!(e.start_time && e.end_time);
          const label = !hasRange
            ? "Closed all day"
            : e.closed
              ? `Blocked ${fmt12(e.start_time)}–${fmt12(e.end_time)}`
              : `Open only ${fmt12(e.start_time)}–${fmt12(e.end_time)}`;
          const variant = e.closed ? "secondary" : "outline";
          return (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">
                  {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <Badge variant={variant} className="ml-2">
                  {label}
                </Badge>
                {e.note && <span className="ml-2 text-muted-foreground">{e.note}</span>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove({ data: { businessId, id: e.id } }).then(onChange)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {exceptions.length === 0 && (
          <p className="text-xs text-muted-foreground">No date overrides yet.</p>
        )}
      </div>
    </Card>
  );
}

/* ---------- Bookings inbox ---------- */

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BookingsInboxSection({
  businessId,
  businessName,
  bookings,
  assignees,
  onChange,
}: {
  businessId: string;
  businessName?: string;
  bookings: Booking[];
  assignees: Assignee[];
  onChange: () => void;
}) {
  const update = useServerFn(updateBookingStatus);
  const assign = useServerFn(assignBooking);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const statusFiltered = useMemo(
    () => bookings.filter((b) => (filter === "all" ? true : b.status === filter)),
    [bookings, filter],
  );

  const dayKey = selectedDate ? toLocalDateString(selectedDate) : null;
  const calendarFiltered = useMemo(() => {
    if (!dayKey) return [];
    return statusFiltered.filter(
      (b) => toLocalDateString(new Date(b.starts_at)) === dayKey,
    );
  }, [statusFiltered, dayKey]);

  const countsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of statusFiltered) {
      const k = toLocalDateString(new Date(b.starts_at));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [statusFiltered]);

  async function setStatus(id: string, status: string) {
    try {
      await update({ data: { businessId, id, status: status as any } });
      toast.success("Updated");
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function setAssignee(id: string, userId: string | null) {
    try {
      await assign({ data: { businessId, id, assignedUserId: userId } });
      toast.success(userId ? "Assigned" : "Unassigned");
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  // Statuses per day (for dot rendering)
  const statusesByDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of statusFiltered) {
      const k = toLocalDateString(new Date(b.starts_at));
      const arr = m.get(k) ?? [];
      arr.push(b.status);
      m.set(k, arr);
    }
    return m;
  }, [statusFiltered]);

  // Default to calendar view when there's more than 5 bookings
  useMemo(() => {
    if (bookings.length > 5 && view === "list") setView("calendar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function CustomDayButton(props: any) {
    const { day, modifiers, className, ...rest } = props;
    const key = toLocalDateString(day.date);
    const statuses = statusesByDay.get(key) ?? [];
    return (
      <Button
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        data-selected-single={modifiers.selected || undefined}
        data-today={modifiers.today || undefined}
        className={cn(
          "relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-0 leading-none font-normal data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[today=true]:ring-1 data-[today=true]:ring-primary/40",
          className,
        )}
        {...rest}
      >
        <span>{day.date.getDate()}</span>
        {statuses.length > 0 && (
          <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
            {statuses.slice(0, 3).map((s, i) => (
              <span key={i} className={cn("h-1 w-1 rounded-full", STATUS_DOT[s] ?? "bg-foreground")} />
            ))}
            {statuses.length > 3 && (
              <span className="text-[8px] leading-none text-muted-foreground">+{statuses.length - 3}</span>
            )}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Card className="px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">Bookings inbox</h2>
          <p className="text-xs text-muted-foreground">
            Manage incoming requests {businessName ? `for ${businessName}` : ""} — approve, assign, complete.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2.5 py-1",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2.5 py-1",
              view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {["all", "pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s !== "all" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />}
            {s === "all" ? "All" : STATUS_LABEL[s]}
            <span className="opacity-70">
              ({s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {view === "calendar" && (
        <div className="mb-4 grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="rounded-md border border-border p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="pointer-events-auto"
              components={{ DayButton: CustomDayButton }}
            />
            <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
              {Object.entries(STATUS_LABEL).map(([k, label]) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[k])} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
              <div className="text-sm">
                <strong>
                  {selectedDate
                    ? selectedDate.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Pick a date"}
                </strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {calendarFiltered.length} booking{calendarFiltered.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    const d = new Date(selectedDate ?? new Date());
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    const d = new Date(selectedDate ?? new Date());
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <BookingList
              bookings={calendarFiltered}
              assignees={assignees}
              setStatus={setStatus}
              setAssignee={setAssignee}
              emptyText="No bookings on this day."
            />
          </div>
        </div>
      )}

      {view === "list" && (
        <BookingList
          bookings={statusFiltered}
          assignees={assignees}
          setStatus={setStatus}
          setAssignee={setAssignee}
          emptyText={
            bookings.length === 0
              ? "No bookings yet — share your public booking page to start receiving requests."
              : "No bookings match this filter."
          }
        />
      )}
    </Card>
  );
}

function BookingList({
  bookings,
  assignees,
  setStatus,
  setAssignee,
  emptyText,
}: {
  bookings: Booking[];
  assignees: Assignee[];
  setStatus: (id: string, s: string) => void;
  setAssignee: (id: string, userId: string | null) => void;
  emptyText: string;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {bookings
        .slice()
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .map((b) => {
          const assignee = assignees.find((a) => a.user_id === b.assigned_user_id);
          return (
            <div key={b.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[b.status])} />
                    <span className="font-medium">{b.customer_name}</span>
                    <Badge
                      variant={
                        b.status === "pending"
                          ? "destructive"
                          : b.status === "confirmed"
                            ? "default"
                            : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {STATUS_LABEL[b.status]}
                    </Badge>
                    {assignee && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <UserRound className="h-3 w-3" /> {assignee.full_name}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    {new Date(b.starts_at).toLocaleString()} →{" "}
                    {new Date(b.ends_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {b.customer_phone && <span>{formatE164(b.customer_phone)}</span>}
                    {b.customer_phone && b.customer_email && <span> · </span>}
                    {b.customer_email && <span>{b.customer_email}</span>}
                  </div>
                  {b.notes && <div className="mt-1 text-xs">{b.notes}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Select
                    value={b.assigned_user_id ?? "__none__"}
                    onValueChange={(v) => setAssignee(b.id, v === "__none__" ? null : v)}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Assign…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {a.full_name}
                            {a.role === "owner" && (
                              <span className="text-[10px] text-muted-foreground">(owner)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap justify-end gap-1">
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => setStatus(b.id, "confirmed")}>
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(b.id, "cancelled")}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(b.id, "completed")}
                        >
                          Mark done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(b.id, "no_show")}
                        >
                          No-show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(b.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
