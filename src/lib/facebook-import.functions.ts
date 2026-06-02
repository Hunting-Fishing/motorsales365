// Server fns for Facebook Marketplace import. Keep this file thin — only
// createServerFn declarations and their imports — so Vite can split the
// server-only `*.server.ts` deps cleanly out of client bundles.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  firecrawlScrape,
  parseMarketplaceItem,
  extractFbProfileId,
  isFacebookMarketplaceUrl,
  isFacebookProfileUrl,
  profilePageContainsCode,
  generateVerificationCode,
  downloadAndStorePhoto,
} from "./facebook-import.server";

const DAILY_IMPORT_LIMIT = 10;

const ScrapeInput = z.object({
  url: z.string().url().max(2000),
});

/** Step 1 — Scrape a FB Marketplace item URL. Returns extracted preview + seller info. */
export const scrapeFbListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ScrapeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!isFacebookMarketplaceUrl(data.url)) {
      throw new Error(
        "Please paste a Facebook Marketplace item URL (facebook.com/marketplace/item/...).",
      );
    }

    // Rate limit per user per day
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("fb_import_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_IMPORT_LIMIT) {
      throw new Error(
        `Daily import limit reached (${DAILY_IMPORT_LIMIT}/day). Try again tomorrow.`,
      );
    }

    const { data: job } = await supabase
      .from("fb_import_jobs")
      .insert({ user_id: userId, url: data.url, status: "scraping" })
      .select("id")
      .single();

    try {
      const scraped = await firecrawlScrape(data.url);
      const parsed = parseMarketplaceItem(data.url, scraped);
      const sellerProfileId = extractFbProfileId(parsed.sellerProfileUrl);

      // Check if a different user already claimed this FB profile.
      let conflictingOwner = false;
      if (sellerProfileId) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("fb_profile_id", sellerProfileId)
          .maybeSingle();
        if (existing && existing.id !== userId) conflictingOwner = true;
      }

      // Is the CURRENT user already verified for this seller profile?
      let alreadyVerified = false;
      if (sellerProfileId) {
        const { data: me } = await supabase
          .from("profiles")
          .select("fb_profile_id, fb_verified_at")
          .eq("id", userId)
          .maybeSingle();
        alreadyVerified =
          me?.fb_profile_id === sellerProfileId &&
          !!me?.fb_verified_at &&
          new Date(me.fb_verified_at).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000;
      }

      if (job) {
        await supabase
          .from("fb_import_jobs")
          .update({
            status: "scraped",
            extracted_payload: {
              title: parsed.title,
              priceText: parsed.priceText,
              images: parsed.images,
              sellerProfileUrl: parsed.sellerProfileUrl,
              sellerProfileId,
              locationText: parsed.locationText,
              description: parsed.description,
            },
          })
          .eq("id", job.id);
      }

      return {
        jobId: job?.id ?? null,
        extracted: {
          title: parsed.title ?? "",
          description: parsed.description ?? "",
          priceText: parsed.priceText ?? "",
          images: parsed.images,
          sellerProfileUrl: parsed.sellerProfileUrl ?? "",
          sellerProfileId,
          locationText: parsed.locationText ?? "",
        },
        conflictingOwner,
        alreadyVerified,
      };
    } catch (err) {
      if (job) {
        await supabase
          .from("fb_import_jobs")
          .update({ status: "error", error: err instanceof Error ? err.message : "scrape failed" })
          .eq("id", job.id);
      }
      throw err;
    }
  });

/** Step 2 — Issue a verification code; user must place it in their FB profile. */
export const startFbVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sellerProfileUrl: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!isFacebookProfileUrl(data.sellerProfileUrl)) {
      throw new Error("That doesn't look like a Facebook profile URL.");
    }
    const sellerProfileId = extractFbProfileId(data.sellerProfileUrl);
    if (!sellerProfileId) throw new Error("Could not read the Facebook profile id from that URL.");

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("fb_profile_id", sellerProfileId)
      .maybeSingle();
    if (existing && existing.id !== userId) {
      throw new Error(
        "This Facebook profile is already linked to another account. Contact support if this is yours.",
      );
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        fb_verification_code: code,
        fb_verification_code_expires_at: expiresAt,
        fb_verification_method: "code_in_bio",
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { code, expiresAt };
  });

/** Step 3 — Re-scrape the FB profile and confirm the code is present. */
export const checkFbVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sellerProfileUrl: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sellerProfileId = extractFbProfileId(data.sellerProfileUrl);
    if (!sellerProfileId) throw new Error("Invalid profile URL");

    const { data: me } = await supabase
      .from("profiles")
      .select("fb_verification_code, fb_verification_code_expires_at")
      .eq("id", userId)
      .maybeSingle();
    if (!me?.fb_verification_code) throw new Error("No verification code issued. Start over.");
    if (
      me.fb_verification_code_expires_at &&
      new Date(me.fb_verification_code_expires_at) < new Date()
    ) {
      throw new Error("Verification code expired. Please request a new one.");
    }

    const ok = await profilePageContainsCode(data.sellerProfileUrl, me.fb_verification_code);
    if (!ok) {
      return {
        verified: false,
        message:
          "We couldn't find the code on that profile. Make sure your bio/intro is set to Public, then try again.",
      };
    }

    await supabase
      .from("profiles")
      .update({
        fb_profile_url: data.sellerProfileUrl,
        fb_profile_id: sellerProfileId,
        fb_verified_at: new Date().toISOString(),
        fb_verification_code: null,
        fb_verification_code_expires_at: null,
      })
      .eq("id", userId);

    return { verified: true, message: "Facebook profile verified." };
  });

/** Step 4 — Create the listing under the signed-in user, importing photos server-side. */
export const finalizeFbImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        jobId: z.string().uuid().nullable(),
        sourceUrl: z.string().url(),
        sellerProfileUrl: z.string().url(),
        listing: z.object({
          title: z.string().min(3).max(200),
          description: z.string().max(5000).optional().default(""),
          price_php: z.number().min(0).max(1_000_000_000),
          category_slug: z.string().min(1).max(40),
          condition: z.string().max(40).optional().default("Used"),
          region: z.string().max(120).nullable().optional(),
          province: z.string().max(120).nullable().optional(),
          city: z.string().max(120).nullable().optional(),
          barangay: z.string().max(120).nullable().optional(),
          contact_phone: z.string().max(40).nullable().optional(),
        }),
        photoUrls: z.array(z.string().url()).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the user is verified for this FB seller (anti-scammer gate).
    const sellerProfileId = extractFbProfileId(data.sellerProfileUrl);
    const { data: me } = await supabase
      .from("profiles")
      .select("fb_profile_id, fb_verified_at, seller_type")
      .eq("id", userId)
      .maybeSingle();
    if (!me?.fb_profile_id || me.fb_profile_id !== sellerProfileId || !me.fb_verified_at) {
      throw new Error("You must verify ownership of the Facebook profile first.");
    }

    const { data: created, error: insErr } = await supabase
      .from("listings")
      .insert({
        user_id: userId,
        category_slug: data.listing.category_slug,
        title: data.listing.title,
        description: data.listing.description,
        price_php: data.listing.price_php,
        condition: data.listing.condition,
        region: data.listing.region ?? null,
        province: data.listing.province ?? null,
        city: data.listing.city ?? null,
        barangay: data.listing.barangay ?? null,
        contact_phone: data.listing.contact_phone ?? null,
        seller_type: me.seller_type ?? "private",
        status: "draft",
        source: "facebook_import",
        source_url: data.sourceUrl,
      })
      .select("id")
      .single();
    if (insErr || !created) throw new Error(insErr?.message ?? "Could not create listing");

    let stored = 0;
    for (let i = 0; i < data.photoUrls.length; i++) {
      const result = await downloadAndStorePhoto({
        userId,
        listingId: created.id,
        imageUrl: data.photoUrls[i],
        index: i,
      });
      if (!result) continue;
      await supabase.from("listing_media").insert({
        listing_id: created.id,
        type: "photo",
        url: result.publicUrl,
        storage_path: result.path,
        sort_order: i,
      });
      stored++;
    }

    if (data.jobId) {
      await supabase
        .from("fb_import_jobs")
        .update({ status: "imported", listing_id: created.id })
        .eq("id", data.jobId);
    }

    return { listingId: created.id, photosImported: stored };
  });
