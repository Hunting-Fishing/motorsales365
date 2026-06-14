import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";

const SCAM_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Western Union / wire", re: /\b(western\s*union|moneygram|wire\s*transfer)\b/i },
  { label: "Crypto payment", re: /\b(bitcoin|btc|usdt|crypto|binance\s*pay)\b/i },
  { label: "Off-platform contact", re: /\b(whats?app|viber|telegram|wechat)\s*(me|only|\+?\d)/i },
  { label: "Overseas / shipping scam", re: /\b(shipping\s*from|abroad|overseas|currently\s*in\s*[A-Z][a-z]+)\b/i },
  { label: "Deposit pressure", re: /\b(send\s*(a\s*)?deposit|reservation\s*fee|pay\s*first|wire\s*first)\b/i },
  { label: "Gift cards", re: /\b(steam|google\s*play|itunes|amazon)\s*(card|gift)\b/i },
];

export type ReportSignals = {
  duplicatePhotos: { listing_id: string; title: string | null; via: "sha" | "storage_path" }[];
  duplicatePosts: { listing_id: string; title: string | null; user_id: string }[];
  sellerPriorReports: { total: number; accepted: number };
  reporterHistory: { total: number; accepted: number; dismissed: number };
  scamKeywords: string[];
};

export const getReportSignals = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "reports.getSignals")])
  .inputValidator((input: { reportId: string }) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ReportSignals> => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const out: ReportSignals = {
      duplicatePhotos: [],
      duplicatePosts: [],
      sellerPriorReports: { total: 0, accepted: 0 },
      reporterHistory: { total: 0, accepted: 0, dismissed: 0 },
      scamKeywords: [],
    };

    const { data: report } = await supabase
      .from("reports")
      .select("id, listing_id, reporter_id, details")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) return out;

    if ((report as any).reporter_id) {
      const { data: rh } = await supabaseAdmin
        .from("reports")
        .select("status, resolution")
        .eq("reporter_id", (report as any).reporter_id);
      for (const r of rh ?? []) {
        out.reporterHistory.total++;
        if ((r as any).resolution === "accepted") out.reporterHistory.accepted++;
        if ((r as any).resolution === "dismissed") out.reporterHistory.dismissed++;
      }
    }

    if ((report as any).listing_id) {
      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("id, user_id, title, description, price_php")
        .eq("id", (report as any).listing_id)
        .maybeSingle();

      if (listing) {
        const corpus = [(listing as any).title, (listing as any).description, (report as any).details]
          .filter(Boolean)
          .join("\n");
        for (const p of SCAM_PATTERNS) if (p.re.test(corpus)) out.scamKeywords.push(p.label);

        const { data: sellerListings } = await supabaseAdmin
          .from("listings")
          .select("id")
          .eq("user_id", (listing as any).user_id);
        const sellerListingIds = (sellerListings ?? []).map((l: any) => l.id);
        if (sellerListingIds.length) {
          const { data: priors } = await supabaseAdmin
            .from("reports")
            .select("id, resolution")
            .in("listing_id", sellerListingIds)
            .neq("id", (report as any).id);
          for (const p of priors ?? []) {
            out.sellerPriorReports.total++;
            if ((p as any).resolution === "accepted") out.sellerPriorReports.accepted++;
          }
        }

        if ((listing as any).title) {
          const since = new Date(Date.now() - 90 * 86400_000).toISOString();
          const { data: dupPosts } = await supabaseAdmin
            .from("listings")
            .select("id, title, user_id")
            .ilike("title", (listing as any).title)
            .neq("id", (listing as any).id)
            .gte("created_at", since)
            .limit(10);
          out.duplicatePosts = (dupPosts ?? []).map((d: any) => ({
            listing_id: d.id,
            title: d.title,
            user_id: d.user_id,
          }));
        }

        const { data: media } = await supabaseAdmin
          .from("listing_media")
          .select("file_sha256, storage_path")
          .eq("listing_id", (listing as any).id);
        const shas = (media ?? []).map((m: any) => m.file_sha256).filter(Boolean);
        const paths = (media ?? []).map((m: any) => m.storage_path).filter(Boolean);
        const dupMap = new Map<
          string,
          { listing_id: string; title: string | null; via: "sha" | "storage_path" }
        >();
        if (shas.length) {
          const { data: ms } = await supabaseAdmin
            .from("listing_media")
            .select("listing_id, listings:listing_id(title)")
            .in("file_sha256", shas)
            .neq("listing_id", (listing as any).id)
            .limit(20);
          for (const m of ms ?? []) {
            const id = (m as any).listing_id;
            if (!dupMap.has(id))
              dupMap.set(id, {
                listing_id: id,
                title: (m as any).listings?.title ?? null,
                via: "sha",
              });
          }
        }
        if (paths.length) {
          const { data: mp } = await supabaseAdmin
            .from("listing_media")
            .select("listing_id, listings:listing_id(title)")
            .in("storage_path", paths)
            .neq("listing_id", (listing as any).id)
            .limit(20);
          for (const m of mp ?? []) {
            const id = (m as any).listing_id;
            if (!dupMap.has(id))
              dupMap.set(id, {
                listing_id: id,
                title: (m as any).listings?.title ?? null,
                via: "storage_path",
              });
          }
        }
        out.duplicatePhotos = Array.from(dupMap.values()).slice(0, 10);
      }
    } else if ((report as any).details) {
      for (const p of SCAM_PATTERNS) if (p.re.test((report as any).details)) out.scamKeywords.push(p.label);
    }

    try {
      await supabaseAdmin
        .from("reports")
        .update({ signals: out as any } as never)
        .eq("id", (report as any).id);
    } catch {}

    return out;
  });

export const getReporterCounts = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "reports.getReporterCounts")])
  .inputValidator((input: { reporterIds: string[] }) =>
    z.object({ reporterIds: z.array(z.string().uuid()).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.reporterIds.length === 0) return { counts: {} as Record<string, any> };
    const { data: rows } = await context.supabase
      .from("reports")
      .select("reporter_id, status, resolution")
      .in("reporter_id", data.reporterIds);
    const counts: Record<
      string,
      { total: number; open: number; resolved: number; accepted: number; dismissed: number }
    > = {};
    for (const r of rows ?? []) {
      const id = (r as any).reporter_id as string;
      if (!id) continue;
      counts[id] ??= { total: 0, open: 0, resolved: 0, accepted: 0, dismissed: 0 };
      counts[id].total++;
      if ((r as any).status === "open") counts[id].open++;
      if ((r as any).status === "resolved") counts[id].resolved++;
      if ((r as any).resolution === "accepted") counts[id].accepted++;
      if ((r as any).resolution === "dismissed") counts[id].dismissed++;
    }
    return { counts };
  });

export const setReportResolution = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "reports.setResolution")])
  .inputValidator((input: { id: string; resolution: "accepted" | "dismissed" }) =>
    z
      .object({ id: z.string().uuid(), resolution: z.enum(["accepted", "dismissed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reports")
      .update({
        status: "resolved",
        resolution: data.resolution,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReportEvidenceUrls = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "reports.getEvidenceUrls")])
  .inputValidator((input: { paths: string[] }) =>
    z.object({ paths: z.array(z.string().min(1).max(500)).max(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urls: { path: string; url: string | null }[] = [];
    for (const p of data.paths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("report-evidence")
        .createSignedUrl(p, 60 * 60);
      urls.push({ path: p, url: signed?.signedUrl ?? null });
    }
    return { urls };
  });
