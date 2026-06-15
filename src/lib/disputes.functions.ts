import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole, requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";

export type DisputeRow = {
  id: string;
  report_id: string;
  user_id: string;
  message: string;
  evidence_urls: string[];
  status: "open" | "upheld" | "overturned" | "withdrawn";
  admin_response: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  score_refund: number;
  created_at: string;
  updated_at: string;
};

export const getReportForDispute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("reports")
      .select(
        "id, reason, category, public_summary, status, resolution, resolved_at, listing_id, listings(id,title,user_id,status)",
      )
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Report not found");
    const listing = (report as any).listings;
    if (!listing || listing.user_id !== userId) throw new Error("Forbidden");

    const deadline = (report as any).resolved_at
      ? new Date(new Date((report as any).resolved_at).getTime() + 14 * 86400_000).toISOString()
      : null;
    const open = !!deadline && new Date(deadline) > new Date();

    const { data: existing } = await supabase
      .from("report_disputes")
      .select("*")
      .eq("report_id", data.reportId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      report: {
        id: (report as any).id,
        reason: (report as any).reason,
        category: (report as any).category,
        public_summary: (report as any).public_summary,
        status: (report as any).status,
        resolution: (report as any).resolution,
        resolved_at: (report as any).resolved_at,
        listing_title: listing?.title ?? null,
        listing_id: listing?.id ?? null,
      },
      deadline,
      windowOpen: open,
      existingDispute: (existing ?? null) as DisputeRow | null,
    };
  });

export const fileDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { reportId: string; message: string; evidenceUrls?: string[] }) =>
      z
        .object({
          reportId: z.string().uuid(),
          message: z.string().min(20).max(4000),
          evidenceUrls: z.array(z.string().max(500)).max(5).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("report_disputes")
      .insert({
        report_id: data.reportId,
        user_id: context.userId,
        message: data.message,
        evidence_urls: data.evidenceUrls ?? [],
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id as string };
  });

export const listMyDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("report_disputes")
      .select("*, reports(reason, public_summary, listing_id, listings(title))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { disputes: (data ?? []) as any[] };
  });

export const listOpenDisputes = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "disputes.list")])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("report_disputes")
      .select("*, reports(reason, listing_id, listings(title))")
      .eq("status", "open")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { disputes: (data ?? []) as any[] };
  });

export const getDisputeForReport = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "disputes.getForReport")])
  .inputValidator((input: { reportId: string }) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("report_disputes")
      .select("*")
      .eq("report_id", data.reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { dispute: (row ?? null) as DisputeRow | null };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("disputes.resolve")])
  .inputValidator(
    (input: { disputeId: string; decision: "uphold" | "overturn"; response: string }) =>
      z
        .object({
          disputeId: z.string().uuid(),
          decision: z.enum(["uphold", "overturn"]),
          response: z.string().min(10).max(2000),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_report_dispute", {
      _dispute_id: data.disputeId,
      _decision: data.decision,
      _response: data.response,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
