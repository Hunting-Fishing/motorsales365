import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Trash2, Plus, CalendarDays, List, RefreshCcw, UserRound } from "lucide-react";
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
import { isStructuredHours, DAY_KEYS, type StructuredHours } from "@/lib/business-hours";
import { formatE164 } from "@/data/country-codes";
import { cn } from "@/lib/utils";

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
  businessHours,
  items,
  availability,
  exceptions,
  bookings,
  onChange,
}: {
  businessId: string;
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

  return (
    <div className="space-y-6">
      <BookableItemsSection businessId={businessId} items={items} onChange={onChange} />
      <WeeklyHoursSection
        businessId={businessId}
        businessHours={businessHours}
        availability={availability}
        onChange={onChange}
      />
      <ExceptionsSection businessId={businessId} exceptions={exceptions} onChange={onChange} />
      <BookingsInboxSection
        businessId={businessId}
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
  buffer_min: 0,
  price_php: null as number | null,
  max_concurrent: 1,
  require_approval: true,
  lead_time_hours: 2,
  horizon_days: 30,
  active: true,
};

function BookableItemsSection({
  businessId,
  items,
  onChange,
}: {
  businessId: string;
  items: Item[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertBookableItem);
  const remove = useServerFn(deleteBookableItem);
  const [draft, setDraft] = useState<any | null>(null);

  async function save() {
    if (!draft.title?.trim()) return toast.error("Title required");
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
      toast.success("Saved");
      setDraft(null);
      onChange();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  }

  async function del(id: string) {
    if (!(await confirm({ title: "Delete this bookable item?", destructive: true }))) return;
    try {
      await remove({ data: { businessId, id } });
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Bookable services</h2>
          <p className="text-xs text-muted-foreground">What customers can book online.</p>
        </div>
        {!draft && (
          <Button size="sm" onClick={() => setDraft({ ...emptyItem })}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {draft && (
        <div className="mb-4 space-y-3 rounded-lg border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={120}
              />
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
              />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={draft.duration_min}
                onChange={(e) => setDraft({ ...draft, duration_min: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Buffer between bookings (min)</Label>
              <Input
                type="number"
                value={draft.buffer_min}
                onChange={(e) => setDraft({ ...draft, buffer_min: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Max concurrent</Label>
              <Input
                type="number"
                value={draft.max_concurrent}
                onChange={(e) => setDraft({ ...draft, max_concurrent: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Lead time (hours)</Label>
              <Input
                type="number"
                value={draft.lead_time_hours}
                onChange={(e) => setDraft({ ...draft, lead_time_hours: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Booking horizon (days)</Label>
              <Input
                type="number"
                value={draft.horizon_days}
                onChange={(e) => setDraft({ ...draft, horizon_days: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="m-0">Require approval</Label>
              <Switch
                checked={!!draft.require_approval}
                onCheckedChange={(v) => setDraft({ ...draft, require_approval: v })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 && !draft && (
        <p className="text-sm text-muted-foreground">No bookable services yet.</p>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{it.title}</span>
                {!it.active && <Badge variant="secondary">inactive</Badge>}
                {it.require_approval && <Badge variant="outline">approval</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {it.duration_min}m{it.price_php != null && <> · ₱{it.price_php}</>}
                {it.max_concurrent > 1 && <> · ×{it.max_concurrent}</>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setDraft(it)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(it.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
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

/**
 * Convert the structured business hours (from the Hours tab) into the row
 * shape used by `business_availability`. `24h` becomes a single 00:00–23:59
 * window; `closed` days produce no rows. `open` days emit one row per range.
 */
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

  // "Synced" means availability matches the business open hours, or is empty
  // while business hours exist (first-time setup).
  const initiallySynced =
    hasBusinessHours &&
    (availability.length === 0 || rowsEqual(availability, businessRows));

  const [useBusinessHours, setUseBusinessHours] = useState<boolean>(initiallySynced);
  const [rows, setRows] = useState<Avail[]>(
    initiallySynced ? businessRows : availability,
  );
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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Booking hours</h2>
        {hasBusinessHours && (
          <div className="flex items-center gap-2">
            <Label htmlFor="use-business-hours" className="m-0 text-xs text-muted-foreground">
              Use my business open hours
            </Label>
            <Switch
              id="use-business-hours"
              checked={useBusinessHours}
              onCheckedChange={(v) => {
                setUseBusinessHours(v);
                if (!v) setRows(businessRows); // seed custom editor from current hours
              }}
            />
          </div>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {useBusinessHours
          ? "Synced from your Hours tab — change them there and they apply here automatically."
          : !hasBusinessHours
          ? "Set your weekly open windows for online bookings. (Tip: set your Hours tab to auto-sync.)"
          : "Custom booking hours — independent of your shop open hours."}
      </p>

      {!hasBusinessHours && (
        <div className="mb-3 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          You haven't set business open hours yet. Set them in the <strong>Hours</strong> tab to
          enable one-click sync.
        </div>
      )}

      {!useBusinessHours && hasBusinessHours && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={resyncFromBusinessHours}>
            <RefreshCcw className="mr-1 h-3 w-3" /> Re-sync from Hours
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {WEEKDAYS.map((name, idx) => {
          const dayRows = effectiveRows
            .map((r, i) => ({ r, i }))
            .filter((x) => x.r.weekday === idx);
          return (
            <div key={idx} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">{name}</div>
                {!useBusinessHours && (
                  <Button size="sm" variant="outline" onClick={() => addRow(idx)}>
                    <Plus className="mr-1 h-3 w-3" /> Window
                  </Button>
                )}
              </div>
              {dayRows.length === 0 ? (
                <div className="text-xs text-muted-foreground">Closed</div>
              ) : (
                <div className="space-y-2">
                  {dayRows.map(({ r, i }) => (
                    <div key={i} className="flex items-center gap-2">
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
      <div className="mt-4 flex justify-end">
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
    if (!date) return;
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
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">Holidays &amp; date overrides</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Close a full day, block a specific time range, or open a custom window for one date.
      </p>
      <div className="mb-3 grid gap-2 sm:grid-cols-[auto,1fr] sm:items-end">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          <div>
            <Label>Type</Label>
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
            <>
              <div>
                <Label>From</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 w-28"
                />
              </div>
              <div>
                <Label>To</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 w-28"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Holiday, lunch break, etc."
              maxLength={200}
              className="h-9"
            />
          </div>
          <Button onClick={add}>Add</Button>
        </div>
      </div>
      <div className="space-y-2">
        {exceptions.map((e) => {
          const hasRange = !!(e.start_time && e.end_time);
          const label = !hasRange
            ? "Closed all day"
            : e.closed
              ? `Blocked ${e.start_time}–${e.end_time}`
              : `Open only ${e.start_time}–${e.end_time}`;
          const variant = e.closed ? "secondary" : "outline";
          return (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{e.date}</span>
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
        {exceptions.length === 0 && <p className="text-sm text-muted-foreground">No exceptions.</p>}
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
  bookings,
  assignees,
  onChange,
}: {
  businessId: string;
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

  const visible = view === "calendar" ? calendarFiltered : statusFiltered;

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Bookings</h2>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1",
              view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {["all", "pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
            <span className="ml-1 opacity-70">
              ({s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {view === "calendar" && (
        <div className="mb-4 grid gap-4 md:grid-cols-[auto,1fr]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className={cn("pointer-events-auto rounded-md border p-3")}
            modifiers={{
              hasBookings: (date) => (countsByDay.get(toLocalDateString(date)) ?? 0) > 0,
            }}
            modifiersClassNames={{
              hasBookings: "relative font-semibold text-primary",
            }}
          />
          <div className="text-xs text-muted-foreground">
            {selectedDate ? (
              <>
                <strong className="text-foreground">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>{" "}
                · {calendarFiltered.length} booking
                {calendarFiltered.length === 1 ? "" : "s"}
              </>
            ) : (
              "Pick a date to see bookings"
            )}
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {view === "calendar" ? "No bookings on this day." : "No bookings."}
        </p>
      )}

      <div className="space-y-2">
        {visible
          .slice()
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
          .map((b) => {
            const assignee = assignees.find((a) => a.user_id === b.assigned_user_id);
            return (
              <div key={b.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.customer_name}</span>
                      <Badge
                        variant={
                          b.status === "pending"
                            ? "destructive"
                            : b.status === "confirmed"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {STATUS_LABEL[b.status]}
                      </Badge>
                      {assignee && (
                        <Badge variant="outline" className="gap-1">
                          <UserRound className="h-3 w-3" /> {assignee.full_name}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
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
    </Card>
  );
}
