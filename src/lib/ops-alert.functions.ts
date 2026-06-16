import { createServerFn } from "@tanstack/react-start";

/**
 * Public server function to surface client-side load failures to the
 * Admin → Alerts page. Intentionally unauthenticated so unauthenticated
 * visitors can also report a broken catalog load; payload is sanitized
 * and writes go through `alertOps` (which dedupes + uses service role).
 */
export const reportClientLoadFailure = createServerFn({ method: "POST" })
  .inputValidator((input: { event: string; details?: Record<string, unknown> }) => ({
    event: String(input.event).slice(0, 120),
    details: input.details && typeof input.details === "object" ? input.details : {},
  }))
  .handler(async ({ data }) => {
    const { alertOps } = await import("@/lib/alerting.server");
    await alertOps(data.event, data.details, {
      severity: "warning",
      source: "client",
    });
    return { ok: true };
  });
