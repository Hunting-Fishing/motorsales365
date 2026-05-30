/** Pure client-safe helpers for booking slot computation. */

export type AvailabilityRow = { weekday: number; start_time: string; end_time: string };
export type ExceptionRow = { date: string; closed: boolean; start_time: string | null; end_time: string | null };
export type ExistingBooking = { bookable_item_id: string; starts_at: string; ends_at: string };

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtTime(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function computeSlots(opts: {
  date: string; // YYYY-MM-DD local
  itemDurationMin: number;
  itemBufferMin: number;
  maxConcurrent: number;
  itemId: string;
  availability: AvailabilityRow[];
  exceptions: ExceptionRow[];
  bookings: ExistingBooking[];
  leadTimeHours: number;
}): { startsAtIso: string; label: string }[] {
  const [Y, M, D] = opts.date.split("-").map(Number);
  const exc = opts.exceptions.find((e) => e.date === opts.date);
  let windows: { start: number; end: number }[] = [];
  if (exc) {
    if (exc.closed) return [];
    if (exc.start_time && exc.end_time) windows.push({ start: toMinutes(exc.start_time), end: toMinutes(exc.end_time) });
  } else {
    const dow = new Date(Y, M - 1, D).getDay();
    windows = opts.availability
      .filter((a) => a.weekday === dow)
      .map((a) => ({ start: toMinutes(a.start_time), end: toMinutes(a.end_time) }));
  }
  if (windows.length === 0) return [];

  const step = opts.itemDurationMin + opts.itemBufferMin;
  const leadCutoff = Date.now() + opts.leadTimeHours * 3600000;
  const slots: { startsAtIso: string; label: string }[] = [];

  for (const w of windows) {
    for (let t = w.start; t + opts.itemDurationMin <= w.end; t += step) {
      const startDate = new Date(Y, M - 1, D, Math.floor(t / 60), t % 60);
      const endDate = new Date(startDate.getTime() + opts.itemDurationMin * 60000);
      if (startDate.getTime() < leadCutoff) continue;
      const overlapping = opts.bookings.filter(
        (b) =>
          b.bookable_item_id === opts.itemId &&
          new Date(b.starts_at).getTime() < endDate.getTime() &&
          new Date(b.ends_at).getTime() > startDate.getTime(),
      ).length;
      if (overlapping >= opts.maxConcurrent) continue;
      slots.push({ startsAtIso: startDate.toISOString(), label: fmtTime(t) });
    }
  }
  return slots;
}
