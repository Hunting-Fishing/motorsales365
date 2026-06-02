import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import {
  upsertBookableItem,
  deleteBookableItem,
  replaceWeeklyAvailability,
  upsertException,
  deleteException,
  updateBookingStatus,
} from "@/lib/business-bookings.functions";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Item = any;
type Avail = { weekday: number; start_time: string; end_time: string };
type Exc = any;
type Booking = any;

export function BookingsTab({
  businessId,
  items,
  availability,
  exceptions,
  bookings,
  onChange,
}: {
  businessId: string;
  items: Item[];
  availability: Avail[];
  exceptions: Exc[];
  bookings: Booking[];
  onChange: () => void;
}) {
  return (
    <div className="space-y-6">
      <BookableItemsSection businessId={businessId} items={items} onChange={onChange} />
      <WeeklyHoursSection businessId={businessId} availability={availability} onChange={onChange} />
      <ExceptionsSection businessId={businessId} exceptions={exceptions} onChange={onChange} />
      <BookingsInboxSection businessId={businessId} bookings={bookings} onChange={onChange} />
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
          price_php: draft.price_php != null && draft.price_php !== "" ? Number(draft.price_php) : null,
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
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Price (PHP, optional)</Label>
              <Input
                type="number"
                value={draft.price_php ?? ""}
                onChange={(e) => setDraft({ ...draft, price_php: e.target.value === "" ? null : Number(e.target.value) })}
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
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}

      {items.length === 0 && !draft && (
        <p className="text-sm text-muted-foreground">No bookable services yet.</p>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{it.title}</span>
                {!it.active && <Badge variant="secondary">inactive</Badge>}
                {it.require_approval && <Badge variant="outline">approval</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {it.duration_min}m
                {it.price_php != null && <> · ₱{it.price_php}</>}
                {it.max_concurrent > 1 && <> · ×{it.max_concurrent}</>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setDraft(it)}>Edit</Button>
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

function WeeklyHoursSection({
  businessId,
  availability,
  onChange,
}: {
  businessId: string;
  availability: Avail[];
  onChange: () => void;
}) {
  const replace = useServerFn(replaceWeeklyAvailability);
  const [rows, setRows] = useState<Avail[]>(availability.length > 0 ? availability : []);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await replace({ data: { businessId, rows } });
      toast.success("Hours saved");
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

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">Booking hours</h2>
      <p className="mb-4 text-xs text-muted-foreground">Weekly open windows when customers can book. Add multiple per day for split hours.</p>
      <div className="space-y-3">
        {WEEKDAYS.map((name, idx) => {
          const dayRows = rows.map((r, i) => ({ r, i })).filter((x) => x.r.weekday === idx);
          return (
            <div key={idx} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">{name}</div>
                <Button size="sm" variant="outline" onClick={() => addRow(idx)}>
                  <Plus className="mr-1 h-3 w-3" /> Window
                </Button>
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
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...r, end_time: e.target.value };
                          setRows(next);
                        }}
                        className="h-9 w-32"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save hours"}</Button>
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
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
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
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 w-28" />
              </div>
              <div>
                <Label>To</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 w-28" />
              </div>
            </>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Holiday, lunch break, etc." maxLength={200} className="h-9" />
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
            <div key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{e.date}</span>
                <Badge variant={variant} className="ml-2">{label}</Badge>
                {e.note && <span className="ml-2 text-muted-foreground">{e.note}</span>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove({ data: { businessId, id: e.id } }).then(onChange)}>
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

function BookingsInboxSection({
  businessId,
  bookings,
  onChange,
}: {
  businessId: string;
  bookings: Booking[];
  onChange: () => void;
}) {
  const update = useServerFn(updateBookingStatus);
  const [filter, setFilter] = useState<string>("all");

  const filtered = bookings.filter((b) => (filter === "all" ? true : b.status === filter));

  async function setStatus(id: string, status: string) {
    try {
      await update({ data: { businessId, id, status: status as any } });
      toast.success("Updated");
      onChange();
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Bookings</h2>
      <div className="mb-3 flex flex-wrap gap-1">
        {["all", "pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
            <span className="ml-1 opacity-70">({s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No bookings.</p>}

      <div className="space-y-2">
        {filtered.map((b) => (
          <div key={b.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.customer_name}</span>
                  <Badge variant={b.status === "pending" ? "destructive" : b.status === "confirmed" ? "default" : "secondary"}>
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {b.customer_phone && <span>{b.customer_phone}</span>}
                  {b.customer_phone && b.customer_email && <span> · </span>}
                  {b.customer_email && <span>{b.customer_email}</span>}
                </div>
                {b.notes && <div className="mt-1 text-xs">{b.notes}</div>}
              </div>
              <div className="flex flex-wrap gap-1">
                {b.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setStatus(b.id, "confirmed")}>Confirm</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "cancelled")}>Decline</Button>
                  </>
                )}
                {b.status === "confirmed" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "completed")}>Mark done</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "no_show")}>No-show</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "cancelled")}>Cancel</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
