import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireDomainRole, requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import type { Database } from "@/integrations/supabase/types";

const slotKeySchema = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/);

// ---------------- PUBLIC ----------------

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * For a list of slot_keys returns the best active creative per slot.
 * Advertiser ads in window win over placeholders; otherwise picks lowest position.
 */
export const getLiveCreativesForSlots = createServerFn({ method: "POST" })
  .inputValidator((input: { slotKeys: string[] }) =>
    z.object({ slotKeys: z.array(slotKeySchema).min(1).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: slots, error: e1 } = await sb
      .from("ad_slots")
      .select("id, slot_key")
      .in("slot_key", data.slotKeys)
      .eq("active", true);
    if (e1) throw new Error(e1.message);
    const slotIds = (slots ?? []).map((s) => s.id);
    if (slotIds.length === 0) return { creatives: {} as Record<string, any> };

    const nowIso = new Date().toISOString();
    const { data: assigns, error: e2 } = await sb
      .from("ad_slot_assignments")
      .select(
        "slot_id, position, starts_at, ends_at, creative:ad_creatives(id, kind, image_url, headline, alt_text, target_url, caption, status)",
      )
      .in("slot_id", slotIds)
      .eq("active", true)
      .order("position", { ascending: true });
    if (e2) throw new Error(e2.message);

    const bySlot: Record<string, any> = {};
    for (const slot of slots ?? []) {
      const candidates = (assigns ?? []).filter((a: any) => {
        if (a.slot_id !== slot.id) return false;
        if (a.starts_at && a.starts_at > nowIso) return false;
        if (a.ends_at && a.ends_at < nowIso) return false;
        const cr = a.creative;
        if (!cr) return false;
        if (cr.kind === "advertiser" && cr.status !== "approved") return false;
        return true;
      });
      // advertiser ads beat placeholders, then lowest position
      candidates.sort((a: any, b: any) => {
        const ka = a.creative.kind === "advertiser" ? 0 : 1;
        const kb = b.creative.kind === "advertiser" ? 0 : 1;
        if (ka !== kb) return ka - kb;
        return a.position - b.position;
      });
      const pick = candidates[0];
      if (pick) bySlot[slot.slot_key] = pick.creative;
    }
    return { creatives: bySlot };
  });

// ---------------- ADMIN: slots ----------------

const adminGate = (label: string) => requireDomainRole("ads_manager", label);

export const listAdSlots = createServerFn({ method: "GET" })
  .middleware([adminGate("advertise-slots.list")])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data: slots, error } = await supabase
      .from("ad_slots")
      .select("*")
      .order("placement", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: assigns } = await supabase
      .from("ad_slot_assignments")
      .select(
        "id, slot_id, position, active, starts_at, ends_at, creative:ad_creatives(id, kind, image_url, headline, alt_text, target_url, status, spec_ok, spec_errors, image_width, image_height, file_size_bytes, mime_type)",
      )
      .order("position", { ascending: true });

    return { slots: slots ?? [], assignments: assigns ?? [] };
  });

const updateSlotSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  min_width: z.number().int().min(50).max(8000).optional(),
  min_height: z.number().int().min(50).max(8000).optional(),
  aspect_ratio: z.string().max(20).nullable().optional(),
  max_bytes: z.number().int().min(10_000).max(50_000_000).optional(),
  allowed_mime: z.array(z.string().max(80)).min(1).max(8).optional(),
  active: z.boolean().optional(),
});

export const updateAdSlot = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-slots.update")])
  .inputValidator((input: unknown) => updateSlotSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { id, ...patch } = data;
    const { error } = await supabase.from("ad_slots").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderAdSlots = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-slots.reorder")])
  .inputValidator((input: { placement: string; orderedIds: string[] }) =>
    z.object({ placement: z.string().min(1).max(64), orderedIds: z.array(z.string().uuid()).min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    await Promise.all(
      data.orderedIds.map((id, idx) =>
        supabase.from("ad_slots").update({ position: idx }).eq("id", id).eq("placement", data.placement),
      ),
    );
    return { ok: true };
  });

// ---------------- ADMIN: placeholder creatives + assignments ----------------

const placeholderCreateSchema = z.object({
  slot_id: z.string().uuid(),
  storage_path: z.string().min(1).max(500),
  image_url: z.string().url().max(2000),
  image_width: z.number().int().min(1).max(20000),
  image_height: z.number().int().min(1).max(20000),
  file_size_bytes: z.number().int().min(1),
  mime_type: z.string().max(80),
  headline: z.string().max(200).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  alt_text: z.string().max(300).nullable().optional(),
  target_url: z.string().url().max(2000).nullable().optional(),
});

function validateCreativeAgainstSlot(
  slot: any,
  c: { image_width: number; image_height: number; file_size_bytes: number; mime_type: string },
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (slot.min_width && c.image_width < slot.min_width)
    errors.push(`Width ${c.image_width}px below minimum ${slot.min_width}px`);
  if (slot.min_height && c.image_height < slot.min_height)
    errors.push(`Height ${c.image_height}px below minimum ${slot.min_height}px`);
  if (slot.max_bytes && c.file_size_bytes > slot.max_bytes)
    errors.push(`File ${(c.file_size_bytes / 1024 / 1024).toFixed(2)}MB exceeds ${(slot.max_bytes / 1024 / 1024).toFixed(2)}MB`);
  if (slot.allowed_mime && !slot.allowed_mime.includes(c.mime_type))
    errors.push(`Type ${c.mime_type} not in ${slot.allowed_mime.join(", ")}`);
  if (slot.aspect_ratio) {
    const [aw, ah] = String(slot.aspect_ratio).split(":").map(Number);
    if (aw && ah) {
      const target = aw / ah;
      const actual = c.image_width / c.image_height;
      const tol = 0.05;
      if (Math.abs(actual - target) / target > tol)
        errors.push(`Aspect ${actual.toFixed(2)} differs from ${slot.aspect_ratio} (${target.toFixed(2)})`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const createPlaceholderCreative = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-placeholders.create")])
  .inputValidator((input: unknown) => placeholderCreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: slot, error: e1 } = await supabase
      .from("ad_slots")
      .select("*")
      .eq("id", data.slot_id)
      .maybeSingle();
    if (e1 || !slot) throw new Error(e1?.message ?? "Slot not found");

    const check = validateCreativeAgainstSlot(slot, {
      image_width: data.image_width,
      image_height: data.image_height,
      file_size_bytes: data.file_size_bytes,
      mime_type: data.mime_type,
    });

    const { data: creative, error: e2 } = await supabase
      .from("ad_creatives")
      .insert({
        uploaded_by: userId,
        kind: "placeholder",
        storage_path: data.storage_path,
        image_url: data.image_url,
        image_width: data.image_width,
        image_height: data.image_height,
        file_size_bytes: data.file_size_bytes,
        mime_type: data.mime_type,
        headline: data.headline ?? null,
        caption: data.caption ?? null,
        alt_text: data.alt_text ?? null,
        target_url: data.target_url ?? null,
        spec_ok: check.ok,
        spec_errors: check.errors,
        status: "approved",
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);

    // Find next position for this slot among placeholder assignments
    const { data: existing } = await supabase
      .from("ad_slot_assignments")
      .select("position")
      .eq("slot_id", data.slot_id)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (existing?.[0]?.position ?? -1) + 1;

    const { error: e3 } = await supabase.from("ad_slot_assignments").insert({
      slot_id: data.slot_id,
      creative_id: creative.id,
      position: nextPos,
      active: true,
    });
    if (e3) throw new Error(e3.message);
    return { id: creative.id };
  });

const updatePlaceholderSchema = z.object({
  id: z.string().uuid(),
  headline: z.string().max(200).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  alt_text: z.string().max(300).nullable().optional(),
  target_url: z.string().url().max(2000).nullable().optional(),
});

export const updatePlaceholderCreative = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-placeholders.update")])
  .inputValidator((input: unknown) => updatePlaceholderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { id, ...patch } = data;
    const { error } = await supabase
      .from("ad_creatives")
      .update(patch)
      .eq("id", id)
      .eq("kind", "placeholder");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAssignmentActive = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-placeholders.set-active")])
  .inputValidator((input: { id: string; active: boolean }) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("ad_slot_assignments")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlaceholderCreative = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-placeholders.delete")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    // assignments cascade-delete; storage object cleanup is best-effort via admin client
    const { data: cr } = await supabase
      .from("ad_creatives")
      .select("storage_path, kind")
      .eq("id", data.id)
      .maybeSingle();
    if (!cr || cr.kind !== "placeholder") throw new Error("Not a placeholder creative");
    const { error } = await supabase.from("ad_creatives").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("advertisements").remove([cr.storage_path]);
    } catch {
      // ignore — DB row gone, storage cleanup is best-effort
    }
    return { ok: true };
  });

export const reorderAssignments = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("advertise-placeholders.reorder")])
  .inputValidator((input: { slot_id: string; orderedIds: string[] }) =>
    z.object({ slot_id: z.string().uuid(), orderedIds: z.array(z.string().uuid()).min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    await Promise.all(
      data.orderedIds.map((id, idx) =>
        supabase.from("ad_slot_assignments").update({ position: idx }).eq("id", id).eq("slot_id", data.slot_id),
      ),
    );
    return { ok: true };
  });
