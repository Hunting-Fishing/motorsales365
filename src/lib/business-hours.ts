// Structured business hours helpers, timezone-safe for Asia/Manila.

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export type HourRange = { open: string; close: string }; // "HH:MM" 24h
export type DaySchedule = { mode: "open" | "closed" | "24h"; ranges?: HourRange[] };
export type WeekSchedule = Record<DayKey, DaySchedule>;

export type StructuredHours = {
  tz: string;
  primary: WeekSchedule;
  store?: WeekSchedule;
};

export const TZ = "Asia/Manila";

export function emptyWeek(): WeekSchedule {
  const w = {} as WeekSchedule;
  for (const d of DAY_KEYS) w[d] = { mode: "closed" };
  return w;
}

export function emptyStructured(): StructuredHours {
  return { tz: TZ, primary: emptyWeek() };
}

export function isStructuredHours(h: any): h is StructuredHours {
  return !!h && typeof h === "object" && h.primary && DAY_KEYS.some((d) => h.primary[d]);
}

// Convert a Date to weekday + minutes-since-midnight in Asia/Manila.
function nowInManila(now: Date): { day: DayKey; minutes: number; date: Date } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wk = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, DayKey> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
  return { day: map[wk] ?? "mon", minutes: hh * 60 + mm, date: now };
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fmtMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${mm.toString().padStart(2, "0")} ${ap}`;
}
export function formatRange(r: HourRange): string {
  return `${fmtMin(toMin(r.open))} – ${fmtMin(toMin(r.close))}`;
}

const NEXT_DAY: Record<DayKey, DayKey> = {
  mon: "tue", tue: "wed", wed: "thu", thu: "fri", fri: "sat", sat: "sun", sun: "mon",
};

export type HoursState = "open" | "closing_soon" | "opening_soon" | "closed" | "unknown";
export type HoursStatus = { state: HoursState; label: string; detail?: string };

export function getStatus(
  hours: any,
  now: Date = new Date(),
  key: "primary" | "store" = "primary",
  opts: { closingSoonMin?: number; openingSoonMin?: number } = {},
): HoursStatus {
  if (!isStructuredHours(hours)) return { state: "unknown", label: "" };
  const week = hours[key];
  if (!week) return { state: "unknown", label: "" };
  const closingSoon = opts.closingSoonMin ?? 30;
  const openingSoon = opts.openingSoonMin ?? 60;
  const { day, minutes } = nowInManila(now);

  const today = week[day];
  if (today?.mode === "24h") return { state: "open", label: "Open 24 hours" };

  if (today?.mode === "open" && today.ranges) {
    for (const r of today.ranges) {
      const o = toMin(r.open);
      let c = toMin(r.close);
      if (c <= o) c += 24 * 60; // overnight
      if (minutes >= o && minutes < c) {
        const remain = c - minutes;
        if (remain <= closingSoon) {
          return { state: "closing_soon", label: `Closing soon`, detail: `Closes at ${fmtMin(c % (24 * 60))}` };
        }
        return { state: "open", label: "Open now", detail: `Closes at ${fmtMin(c % (24 * 60))}` };
      }
      if (minutes < o && o - minutes <= openingSoon) {
        return { state: "opening_soon", label: "Opening soon", detail: `Opens at ${fmtMin(o)}` };
      }
    }
    // Find next opening today after now
    const nextToday = today.ranges
      .map((r) => toMin(r.open))
      .filter((o) => o > minutes)
      .sort((a, b) => a - b)[0];
    if (nextToday !== undefined) {
      return { state: "closed", label: "Closed", detail: `Opens at ${fmtMin(nextToday)}` };
    }
  }

  // Look ahead up to 7 days for next opening
  let d: DayKey = NEXT_DAY[day];
  for (let i = 1; i <= 7; i++) {
    const ds = week[d];
    if (ds?.mode === "24h") {
      return { state: "closed", label: "Closed", detail: `Opens ${DAY_LABELS[d]} 12:00 AM` };
    }
    if (ds?.mode === "open" && ds.ranges && ds.ranges.length > 0) {
      const o = Math.min(...ds.ranges.map((r) => toMin(r.open)));
      return { state: "closed", label: "Closed", detail: `Opens ${DAY_LABELS[d]} ${fmtMin(o)}` };
    }
    d = NEXT_DAY[d];
  }
  return { state: "closed", label: "Closed" };
}

// Legacy: convert old free-text { monday: "9-5" } into renderable rows.
export function legacyToRows(h: any): { day: string; text: string }[] | null {
  if (!h || typeof h !== "object" || isStructuredHours(h)) return null;
  const keys = Object.keys(h);
  if (keys.length === 0) return null;
  return keys.map((k) => ({ day: k, text: String(h[k]) }));
}
