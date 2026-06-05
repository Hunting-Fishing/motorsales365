import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PUBLIC: list open lead offers (redacted preview only — no PII).
 */
export const listOpenLeadOffers = createServerFn({ method: "GET" })
  .inputValidator((input: { categorySlug?: string; region?: string; limit?: number }) =>
    z
      .object({
        categorySlug: z.string().min(1).max(60).optional(),
        region: z.string().min(1).max(120).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await (supabaseAdmin as any).rpc("list_open_lead_offers", {
      _category_slug: data.categorySlug ?? null,
      _region: data.region ?? null,
      _limit: data.limit ?? 60,
    });
    if (error) throw new Error(error.message);
    return { offers: (rows ?? []) as any[] };
  });

/**
 * AUTHENTICATED: unlock a lead offer. Requires the buyer to own a business
 * on the Featured or Premium tier (gated soft on UI, enforced here).
 *
 * Returns full contact details on success.
 */
export const unlockLeadOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offerId: string; businessId?: string }) =>
    z
      .object({
        offerId: z.string().uuid(),
        businessId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1) Verify business eligibility — buyer must own a Featured/Premium business
    const { data: ownedBusinesses, error: bErr } = await supabaseAdmin
      .from("businesses")
      .select("id, subscription_tier, name")
      .eq("owner_id", userId)
      .eq("status", "active")
      .in("subscription_tier", ["featured", "premium"]);
    if (bErr) throw new Error(bErr.message);
    if (!ownedBusinesses || ownedBusinesses.length === 0) {
      throw new Error(
        "Lead unlocks require a Featured or Premium business plan. Upgrade your business listing to unlock leads.",
      );
    }

    let chosenBusinessId: string | null = data.businessId ?? null;
    if (chosenBusinessId && !ownedBusinesses.some((b: any) => b.id === chosenBusinessId)) {
      throw new Error("Selected business is not on a paid plan you own.");
    }
    if (!chosenBusinessId) chosenBusinessId = (ownedBusinesses[0] as any).id;

    // 2) Load offer (must still be open, capacity available)
    const { data: offer, error: oErr } = await supabaseAdmin
      .from("lead_offers")
      .select("*")
      .eq("id", data.offerId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!offer) throw new Error("Lead offer not found.");
    if ((offer as any).status !== "open") throw new Error("This lead is no longer available.");
    if (
      (offer as any).expires_at &&
      new Date((offer as any).expires_at).getTime() <= Date.now()
    ) {
      throw new Error("This lead has expired.");
    }
    if ((offer as any).unlocks_count >= (offer as any).max_unlocks) {
      throw new Error("This lead has reached its unlock limit.");
    }

    // 3) Insert unlock (UNIQUE constraint prevents double-unlocks per buyer)
    const { error: uErr } = await supabaseAdmin.from("lead_offer_unlocks").insert({
      offer_id: data.offerId,
      buyer_user_id: userId,
      buyer_business_id: chosenBusinessId,
      price_php: (offer as any).price_php,
    });
    if (uErr) {
      if (uErr.code === "23505") {
        // Already unlocked — fall through to return contact info.
      } else {
        throw new Error(uErr.message);
      }
    } else {
      // 4) Increment unlocks_count and auto-mark sold when capacity reached
      const newCount = ((offer as any).unlocks_count ?? 0) + 1;
      const newStatus =
        newCount >= ((offer as any).max_unlocks ?? 1) ? "sold" : (offer as any).status;
      await supabaseAdmin
        .from("lead_offers")
        .update({ unlocks_count: newCount, status: newStatus })
        .eq("id", data.offerId);
    }

    return {
      offerId: (offer as any).id,
      contact: {
        name: (offer as any).contact_name as string | null,
        email: (offer as any).contact_email as string | null,
        phone: (offer as any).contact_phone as string | null,
        notes: (offer as any).contact_notes as string | null,
      },
      pricePhp: Number((offer as any).price_php),
    };
  });

/**
 * AUTHENTICATED: list the offers the current buyer has already unlocked.
 */
export const listMyUnlockedLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: unlocks, error: uErr } = await supabaseAdmin
      .from("lead_offer_unlocks")
      .select("offer_id, unlocked_at, price_php, buyer_business_id")
      .eq("buyer_user_id", userId)
      .order("unlocked_at", { ascending: false })
      .limit(200);
    if (uErr) throw new Error(uErr.message);
    if (!unlocks || unlocks.length === 0) return { items: [] as any[] };

    const offerIds = unlocks.map((u: any) => u.offer_id);
    const { data: offers, error: oErr } = await supabaseAdmin
      .from("lead_offers")
      .select(
        "id, preview, category_slug, region, city, vehicle_make, vehicle_model, vehicle_year, urgency, contact_name, contact_email, contact_phone, contact_notes",
      )
      .in("id", offerIds);
    if (oErr) throw new Error(oErr.message);

    const byId = new Map<string, any>();
    for (const o of offers ?? []) byId.set((o as any).id, o);

    return {
      items: unlocks.map((u: any) => ({
        unlockedAt: u.unlocked_at,
        pricePhp: Number(u.price_php),
        offer: byId.get(u.offer_id) ?? null,
      })),
    };
  });
