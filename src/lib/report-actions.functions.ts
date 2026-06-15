import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";

const ActionEnum = z.enum([
  "accept",
  "dismiss",
  "reverse",
  "restore_listing",
  "note",
]);

export const applyReportAction = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "reports.applyAction")])
  .inputValidator(
    (input: {
      reportId: string;
      action: z.infer<typeof ActionEnum>;
      note?: string | null;
      hideListing?: boolean;
      deleteListing?: boolean;
      notifyPoster?: boolean;
      reversesActionId?: string | null;
    }) =>
      z
        .object({
          reportId: z.string().uuid(),
          action: ActionEnum,
          note: z.string().min(1).max(2000).nullable().optional(),
          hideListing: z.boolean().optional(),
          deleteListing: z.boolean().optional(),
          notifyPoster: z.boolean().optional(),
          reversesActionId: z.string().uuid().nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("apply_report_action", {
      _report_id: data.reportId,
      _action: data.action,
      _note: data.note ?? null,
      _hide_listing: !!data.hideListing,
      _delete_listing: !!data.deleteListing,
      _notify_poster: !!data.notifyPoster,
      _reverses_action_id: data.reversesActionId ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true, actionId: id as unknown as string };
  });

export type ReportActionRow = {
  id: string;
  report_id: string;
  actor_id: string | null;
  action: string;
  prev_status: string | null;
  new_status: string | null;
  prev_resolution: string | null;
  new_resolution: string | null;
  score_delta: number;
  listing_effect: string;
  notified_poster: boolean;
  note: string | null;
  reversed_by_action_id: string | null;
  created_at: string;
  actor_name?: string | null;
};

export const listReportActions = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "reports.listActions")])
  .inputValidator((input: { reportId: string }) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ actions: ReportActionRow[] }> => {
    const { data: rows, error } = await context.supabase
      .from("report_actions")
      .select("*")
      .eq("report_id", data.reportId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    ) as string[];
    let names: Record<string, string> = {};
    if (actorIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("user_id, full_name, display_name")
        .in("user_id", actorIds);
      for (const p of (profs ?? []) as any[]) {
        names[p.user_id] = p.full_name || p.display_name || "";
      }
    }
    return {
      actions: (rows ?? []).map((r: any) => ({
        ...r,
        actor_name: r.actor_id ? names[r.actor_id] || null : null,
      })) as ReportActionRow[],
    };
  });
