import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify, randomSuffix } from "./rides.server";

const CreateInput = z.object({
  name: z.string().min(1).max(120),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  make: z.string().max(60).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  trim: z.string().max(60).optional().nullable(),
  engine: z.string().max(120).optional().nullable(),
  vehicle_type: z.enum(["car","truck","suv","van","motorcycle","scooter","atv","utv","boat","other"]).default("car"),
});

export const createRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const base = slugify(
      [data.year, data.make, data.model, data.name].filter(Boolean).join(" "),
    ) || "ride";

    let slug = `${base}-${randomSuffix(6)}`;
    for (let i = 0; i < 4; i++) {
      const { data: existing } = await supabase.from("rides" as never).select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${base}-${randomSuffix(6)}`;
    }

    const { data: created, error } = await supabase
      .from("rides" as never)
      .insert({
        user_id: userId,
        slug,
        name: data.name,
        year: data.year ?? null,
        make: data.make ?? null,
        model: data.model ?? null,
        trim: data.trim ?? null,
        engine: data.engine ?? null,
        vehicle_type: data.vehicle_type,
        status: "draft",
      } as never)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return created as unknown as { id: string; slug: string };
  });

export const publishRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), publish: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("rides" as never)
      .update({
        status: data.publish ? "published" : "draft",
        published_at: data.publish ? new Date().toISOString() : null,
      } as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleRideLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ride_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("ride_likes" as never)
      .select("ride_id")
      .eq("ride_id", data.ride_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("ride_likes" as never).delete().eq("ride_id", data.ride_id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await supabase.from("ride_likes" as never).insert({ ride_id: data.ride_id, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const linkRideToListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    ride_id: z.string().uuid(),
    listing_id: z.string().uuid().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify both belong to user
    const { data: ride } = await supabase.from("rides" as never).select("id,user_id").eq("id", data.ride_id).maybeSingle();
    if (!ride || (ride as any).user_id !== userId) throw new Error("Not your ride");
    if (data.listing_id) {
      const { data: listing } = await supabase.from("listings").select("id,user_id").eq("id", data.listing_id).maybeSingle();
      if (!listing || listing.user_id !== userId) throw new Error("Not your listing");
    }
    const { error } = await supabase
      .from("rides" as never)
      .update({ linked_listing_id: data.listing_id, is_for_sale: data.listing_id ? true : false } as never)
      .eq("id", data.ride_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
