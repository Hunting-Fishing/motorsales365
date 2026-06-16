import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasStructuredOpenDay } from "@/lib/business-hours";

// Lenient URL: accept bare domain, normalize to https://, allow null/empty.
const lenientUrl = (max = 500) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return v;
      const t = v.trim();
      if (!t) return null;
      const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      try {
        return new URL(withScheme).toString();
      } catch {
        throw new Error(`Invalid URL: ${v}`);
      }
    });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}


/**
 * Submit a new business listing. Validates input, generates a unique slug
 * (collision-loop), inserts the business row + tag links, and returns the
 * new business id + slug. The DB trigger `tg_notify_business_submitted`
 * enqueues the "business-submitted" email automatically.
 */
export const submitBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        type_slug: z.string().min(1).max(60),
        description: z.string().max(2000).nullable().optional(),
        logo_url: z.string().url().nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        email: z.string().email().max(200).nullable().optional(),
        website: z.string().url().max(500).nullable().optional(),
        messenger_url: z.string().url().max(500).nullable().optional(),
        street_address: z.string().max(300).nullable().optional(),
        region: z.string().max(120).nullable().optional(),
        province: z.string().max(120).nullable().optional(),
        city: z.string().max(120).nullable().optional(),
        barangay: z.string().max(120).nullable().optional(),
        postal_code: z.string().max(20).nullable().optional(),
        brands_carried: z.string().max(500).nullable().optional(),
        price_label: z.string().max(60).nullable().optional(),
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
        tag_slugs: z.array(z.string().min(1).max(80)).max(40).optional(),
        hours: z
          .object({
            tz: z.string().min(1).max(60),
            primary: z.record(
              z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
              z.object({
                mode: z.enum(["open", "closed", "24h"]),
                ranges: z
                  .array(
                    z.object({
                      open: z.string().regex(/^\d{2}:\d{2}$/),
                      close: z.string().regex(/^\d{2}:\d{2}$/),
                    }),
                  )
                  .max(3)
                  .optional(),
              }),
            ),
          })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!hasStructuredOpenDay(data.hours)) {
      throw new Error("Please set at least one open day in your business hours.");
    }

    // 1) Unique-slug loop (max 50 attempts) — checks `businesses.slug` across
    // ALL owners, not just rows the caller can see under RLS, so pending
    // listings owned by other users still count as taken.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = slugify(data.name) || "business";
    let slug = base;
    let found = false;
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const { data: existing, error: chkErr } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (chkErr) throw new Error(chkErr.message);
      if (!existing) {
        slug = candidate;
        found = true;
        break;
      }
    }
    if (!found) {
      slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    }

    const { tag_slugs, ...biz } = data;

    // 2) Insert business (RLS scopes owner_id to auth.uid()).
    // Retry once with a random suffix if we still race on the unique index.
    let row: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: r, error: insErr } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          slug,
          status: "pending",
          ...biz,
        } as any)
        .select("id, slug")
        .single();
      if (!insErr) {
        row = r;
        break;
      }
      if (insErr.code === "23505" || /duplicate key/i.test(insErr.message)) {
        if (attempt === 0) {
          slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
          continue;
        }
        throw new Error("That URL was just taken — please try again.");
      }
      throw new Error(insErr.message);
    }
    if (!row) throw new Error("Failed to create business — please try again.");

    // 3) Tag links (best-effort; non-fatal).
    if (tag_slugs && tag_slugs.length > 0) {
      await supabase
        .from("business_tag_links")
        .insert(tag_slugs.map((s) => ({ business_id: (row as any).id, tag_slug: s })) as any);
    }

    return { id: (row as any).id as string, slug: (row as any).slug as string };
  });
