import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/start-server-core";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Custom domain support for business microsites.
 *
 * Flow:
 *   1. Owner enters a domain (e.g. `laoagtires.com`) — we normalize and mint a token.
 *   2. Owner adds a TXT record at `_365motorsales-verify.<domain>` = <token>.
 *   3. Owner clicks Verify — we resolve TXT via DNS-over-HTTPS (works on Workers).
 *   4. Once verified, the domain resolves to the business's microsite (see /) and
 *      `/businesses/<slug>` remains the SEO canonical URL.
 */

const VERIFY_HOST_PREFIX = "_365motorsales-verify";

const domainSchema = z
  .string()
  .trim()
  .max(253)
  .transform((v) => v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, ""))
  .refine((v) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v), "Invalid domain");

async function assertEditor(supabase: any, userId: string, businessId: string) {
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) throw new Error("Business not found");
  if (biz.owner_id === userId) return;
  const { data: staff } = await supabase
    .from("business_staff")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!staff) throw new Error("Forbidden");
}

function mintToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "365ms-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getBusinessCustomDomain = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId, data.businessId);
    const { data: biz } = await context.supabase
      .from("businesses")
      .select("id, slug, custom_domain, custom_domain_status, custom_domain_verify_token, custom_domain_verified_at")
      .eq("id", data.businessId)
      .maybeSingle();
    return {
      business: biz,
      verifyHost: biz?.custom_domain ? `${VERIFY_HOST_PREFIX}.${biz.custom_domain}` : null,
      instructions: {
        aRecord: { name: "@", type: "A", value: "185.158.133.1" },
        wwwRecord: { name: "www", type: "A", value: "185.158.133.1" },
      },
    };
  });

export const saveBusinessCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; domain: string | null }) =>
    z.object({
      businessId: z.string().uuid(),
      domain: z.union([domainSchema, z.literal(""), z.null()]).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId, data.businessId);
    const domain = data.domain && data.domain !== "" ? data.domain : null;

    if (domain) {
      const { data: existing } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("custom_domain", domain)
        .neq("id", data.businessId)
        .maybeSingle();
      if (existing) throw new Error("That domain is already connected to another business");
    }

    const patch = domain
      ? {
          custom_domain: domain,
          custom_domain_status: "pending",
          custom_domain_verify_token: mintToken(),
          custom_domain_verified_at: null,
        }
      : {
          custom_domain: null,
          custom_domain_status: "none",
          custom_domain_verify_token: null,
          custom_domain_verified_at: null,
        };

    const { error } = await context.supabase.from("businesses").update(patch).eq("id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function lookupTxtViaDoh(host: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json: any = await res.json();
  const answers: any[] = json?.Answer ?? [];
  return answers
    .map((a) => String(a?.data ?? ""))
    .map((s) => s.replace(/^"|"$/g, "").replace(/"\s*"/g, ""))
    .filter(Boolean);
}

export const verifyBusinessCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId, data.businessId);

    const { data: biz } = await context.supabase
      .from("businesses")
      .select("id, custom_domain, custom_domain_verify_token")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!biz?.custom_domain || !biz?.custom_domain_verify_token) {
      throw new Error("No domain connected yet");
    }

    const host = `${VERIFY_HOST_PREFIX}.${biz.custom_domain}`;
    let records: string[] = [];
    try {
      records = await lookupTxtViaDoh(host);
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "DNS lookup failed", records: [] as string[] };
    }
    const found = records.some((r) => r.trim() === biz.custom_domain_verify_token);
    if (!found) {
      return { ok: false, error: `TXT at ${host} did not match the verification token`, records };
    }

    const { error } = await context.supabase
      .from("businesses")
      .update({ custom_domain_status: "verified", custom_domain_verified_at: new Date().toISOString() })
      .eq("id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true, records };
  });

/**
 * Resolve the microsite slug for a given hostname.
 * Public: used by SSR of `/` to detect when a request arrives on a
 * business's connected custom domain and route it to the microsite.
 */
export const resolveBusinessByHost = createServerFn({ method: "GET" })
  .inputValidator((input: { host?: string | null }) =>
    z.object({ host: z.string().max(253).nullable().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    let host = (data.host ?? "").toLowerCase().trim();
    if (!host) {
      // Fall back to the current request's Host header.
      host = (getRequestHeader("host") ?? "").toLowerCase();
    }
    host = host.replace(/:\d+$/, "").replace(/^www\./, "");
    if (!host) return { business: null };

    // Never match our own domains.
    if (
      host.endsWith(".lovable.app") ||
      host === "365motorsales.com" ||
      host === "www.365motorsales.com" ||
      host === "motorsales365.lovable.app" ||
      host === "localhost" ||
      host.endsWith(".localhost")
    ) {
      return { business: null };
    }

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, slug, name, custom_domain")
      .eq("custom_domain", host)
      .eq("custom_domain_status", "verified")
      .maybeSingle();
    return { business: biz ?? null };
  });
