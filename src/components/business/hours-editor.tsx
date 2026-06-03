import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DAY_KEYS,
  DAY_LABELS,
  emptyWeek,
  type DayKey,
  type WeekSchedule,
  type DaySchedule,
} from "@/lib/business-hours";

type Props = {
  value: WeekSchedule;
  onChange: (next: WeekSchedule) => void;
};

export function WeekHoursEditor({ value, onChange }: Props) {
  const set = (d: DayKey, next: DaySchedule) => onChange({ ...value, [d]: next });

  const copyMondayToWeekdays = () => {
    const mon = value.mon;
    const next = { ...value };
    (["tue", "wed", "thu", "fri"] as DayKey[]).forEach((d) => {
      next[d] = clone(mon);
    });
    onChange(next);
  };
  const copyMondayToWeekend = () => {
    const mon = value.mon;
    onChange({ ...value, sat: clone(mon), sun: clone(mon) });
  };
  const setAllClosed = () => onChange(emptyWeek());

  return (
    <div className="space-y-2">
      <div className="mb-1 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copyMondayToWeekdays}>
          <Copy className="mr-1 h-3 w-3" />
          Copy Mon → weekdays
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={copyMondayToWeekend}>
          <Copy className="mr-1 h-3 w-3" />
          Copy Mon → weekend
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={setAllClosed}>
          Reset all to closed
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {DAY_KEYS.map((d) => (
          <DayRow key={d} day={d} value={value[d]} onChange={(n) => set(d, n)} />
        ))}
      </div>
    </div>
  );
}

function clone(s: DaySchedule): DaySchedule {
  return JSON.parse(JSON.stringify(s));
}

function DayRow({
  day,
  value,
  onChange,
}: {
  day: DayKey;
  value: DaySchedule;
  onChange: (s: DaySchedule) => void;
}) {
  const mode = value?.mode ?? "closed";
  const ranges = value?.ranges ?? [];

  const setMode = (m: DaySchedule["mode"]) => {
    if (m === "open") {
      onChange({
        mode: "open",
        ranges: ranges.length ? ranges : [{ open: "09:00", close: "18:00" }],
      });
    } else {
      onChange({ mode: m });
    }
  };
  const updateRange = (i: number, patch: Partial<{ open: string; close: string }>) => {
    const next = ranges.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange({ mode: "open", ranges: next });
  };
  const addRange = () => {
    onChange({ mode: "open", ranges: [...ranges, { open: "13:00", close: "18:00" }].slice(0, 2) });
  };
  const removeRange = (i: number) => {
    const next = ranges.filter((_, idx) => idx !== i);
    onChange(next.length > 0 ? { mode: "open", ranges: next } : { mode: "closed" });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <div className="w-12 text-sm font-medium">{DAY_LABELS[day]}</div>
      <div className="flex rounded-md border bg-background p-0.5 text-xs">
        {(["open", "24h", "closed"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-2 py-1 transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "open" ? "Open" : m === "24h" ? "24 hours" : "Closed"}
          </button>
        ))}
      </div>
      {mode === "open" && (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                type="time"
                value={r.open}
                onChange={(e) => updateRange(i, { open: e.target.value })}
                className="h-8 w-28 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="time"
                value={r.close}
                onChange={(e) => updateRange(i, { close: e.target.value })}
                className="h-8 w-28 text-xs"
              />
              {ranges.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Remove time range"
                  onClick={() => removeRange(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {ranges.length < 2 && (
            <Button type="button" size="sm" variant="ghost" onClick={addRange}>
              <Plus className="mr-1 h-3 w-3" />
              Split
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
