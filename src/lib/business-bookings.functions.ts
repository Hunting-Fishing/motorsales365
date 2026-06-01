import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmailServer } from "@/lib/email/server-enqueue.server";


/* ---------- helpers ---------- */

async function assertEditor(supabase: any, userId: string, businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, organization_id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Business not found");
  if ((data as any).owner_id === userId) return;
  if ((data as any).organization_id) {
    const { data: m } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", (data as any).organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (m) return;
  }
  throw new Error("Not authorized");
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ---------- PUBLIC: load booking config + compute slots ---------- */

/**
 * Public booking config for a business: active bookable items, weekly hours,
 * date exceptions, and existing confirmed/pending bookings in the next N days
 * (so the client can grey out full slots without exposing customer PII).
 */
export const getBookingConfig = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), horizonDays: z.number().int().min(1).max(90).default(30) }).parse(input),
  )
  .handler(async ({ data }) => {
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + data.horizonDays);
    const now = new Date();

    const [items, avail, exc, bookings] = await Promise.all([
      supabaseAdmin
        .from("business_bookable_items")
        .select("id, title, description, duration_min, buffer_min, price_php, max_concurrent, require_approval, lead_time_hours, horizon_days, sort_order")
        .eq("business_id", data.businessId)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("business_availability")
        .select("weekday, start_time, end_time")
        .eq("business_id", data.businessId),
      supabaseAdmin
        .from("business_availability_exceptions")
        .select("date, closed, start_time, end_time")
        .eq("business_id", data.businessId)
        .gte("date", now.toISOString().slice(0, 10))
        .lte("date", horizon.toISOString().slice(0, 10)),
      supabaseAdmin
        .from("business_bookings")
        .select("bookable_item_id, starts_at, ends_at, status")
        .eq("business_id", data.businessId)
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", now.toISOString())
        .lte("starts_at", horizon.toISOString()),
    ]);

    return {
      items: items.data ?? [],
      availability: avail.data ?? [],
      exceptions: exc.data ?? [],
      bookings: bookings.data ?? [],
    };
  });

/* ---------- PUBLIC: create a booking ---------- */

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        bookableItemId: z.string().uuid(),
        startsAt: z.string().datetime(),
        customerName: z.string().min(1).max(120),
        customerPhone: z.string().max(40).optional().nullable(),
        customerEmail: z.string().email().max(200).optional().nullable(),
        userId: z.string().uuid().optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Load item to derive duration + approval
    const { data: item, error: itemErr } = await supabaseAdmin
      .from("business_bookable_items")
      .select("id, business_id, duration_min, buffer_min, max_concurrent, require_approval, lead_time_hours, horizon_days, active")
      .eq("id", data.bookableItemId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (itemErr) throw new Error(itemErr.message);
    if (!item || !(item as any).active) throw new Error("Bookable item not available");

    const start = new Date(data.startsAt);
    const end = new Date(start.getTime() + (item as any).duration_min * 60000);
    const leadMs = (item as any).lead_time_hours * 3600000;
    if (start.getTime() < Date.now() + leadMs) {
      throw new Error("Booking is inside the lead time window");
    }
    const horizonMs = (item as any).horizon_days * 86400000;
    if (start.getTime() > Date.now() + horizonMs) {
      throw new Error("Booking is beyond the booking horizon");
    }

    // Capacity check: overlapping bookings for this item
    const { data: overlap } = await supabaseAdmin
      .from("business_bookings")
      .select("id")
      .eq("bookable_item_id", data.bookableItemId)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", end.toISOString())
      .gt("ends_at", start.toISOString());
    if ((overlap?.length ?? 0) >= (item as any).max_concurrent) {
      throw new Error("That time slot is fully booked");
    }

    const status = (item as any).require_approval ? "pending" : "confirmed";
    const { data: row, error } = await supabaseAdmin
      .from("business_bookings")
      .insert({
        business_id: data.businessId,
        bookable_item_id: data.bookableItemId,
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone?.trim() || null,
        customer_email: data.customerEmail?.trim() || null,
        user_id: data.userId ?? null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status,
        notes: data.notes?.trim() || null,
      } as any)
      .select("id, status, starts_at, ends_at")
      .single();
    if (error) throw new Error(error.message);

    // Fire analytics event + emails (fail-soft)
    try {
      await supabaseAdmin.from("business_page_events").insert({
        business_id: data.businessId,
        kind: status === "confirmed" ? "book_confirmed" : "book_created",
        meta: { booking_id: (row as any).id, bookable_item_id: data.bookableItemId },
      } as any);
    } catch { /* ignore */ }

    // Lookup business + item + owner for emails
    try {
      const [{ data: biz }, { data: itemRow }] = await Promise.all([
        supabaseAdmin
          .from("businesses")
          .select("id, name, slug, owner_id, contact_email")
          .eq("id", data.businessId)
          .maybeSingle(),
        supabaseAdmin
          .from("business_bookable_items")
          .select("title")
          .eq("id", data.bookableItemId)
          .maybeSingle(),
      ]);

      const serviceTitle = (itemRow as any)?.title ?? "Appointment";
      const startsAtHuman = new Date(start.toISOString()).toLocaleString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      });

      // Customer confirmation / request
      if (data.customerEmail) {
        await enqueueTransactionalEmailServer({
          templateName: "booking-customer",
          recipientEmail: data.customerEmail,
          idempotencyKey: `booking-customer-${(row as any).id}`,
          templateData: {
            customer_name: data.customerName.trim(),
            business_name: (biz as any)?.name ?? "the shop",
            business_slug: (biz as any)?.slug ?? "",
            service_title: serviceTitle,
            starts_at_human: startsAtHuman,
            status,
          },
        });
      }

      // Owner notice — prefer contact_email, fall back to owner profile email
      let ownerEmail: string | null = (biz as any)?.contact_email ?? null;
      if (!ownerEmail && (biz as any)?.owner_id) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById((biz as any).owner_id);
        ownerEmail = (u as any)?.user?.email ?? null;
      }
      if (ownerEmail) {
        await enqueueTransactionalEmailServer({
          templateName: "booking-owner",
          recipientEmail: ownerEmail,
          idempotencyKey: `booking-owner-${(row as any).id}`,
          templateData: {
            business_name: (biz as any)?.name ?? "Your business",
            business_id: data.businessId,
            service_title: serviceTitle,
            starts_at_human: startsAtHuman,
            customer_name: data.customerName.trim(),
            customer_phone: data.customerPhone?.trim() || null,
            customer_email: data.customerEmail?.trim() || null,
            notes: data.notes?.trim() || null,
            status,
          },
        });
      }
    } catch (err) {
      console.warn("[bookings] notification email failed", err);
    }

    return { booking: row };
  });


/* ---------- OWNER: bookable items CRUD ---------- */

const bookableInput = z.object({
  id: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  duration_min: z.number().int().min(5).max(480),
  buffer_min: z.number().int().min(0).max(240).default(0),
  price_php: z.number().nonnegative().nullable().optional(),
  max_concurrent: z.number().int().min(1).max(50).default(1),
  require_approval: z.boolean().default(true),
  lead_time_hours: z.number().int().min(0).max(720).default(2),
  horizon_days: z.number().int().min(1).max(180).default(30),
  active: z.boolean().default(true),
  sort_order: z.number().int().optional(),
});

export const upsertBookableItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bookableInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_bookable_items")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("business_bookable_items")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteBookableItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_bookable_items")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- OWNER: weekly availability (bulk replace) ---------- */

export const replaceWeeklyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        rows: z
          .array(
            z.object({
              weekday: z.number().int().min(0).max(6),
              start_time: z.string().regex(/^\d{2}:\d{2}$/),
              end_time: z.string().regex(/^\d{2}:\d{2}$/),
            }),
          )
          .max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    // validate ranges
    for (const r of data.rows) {
      if (toMinutes(r.end_time) <= toMinutes(r.start_time)) {
        throw new Error("End time must be after start time");
      }
    }
    await supabase.from("business_availability").delete().eq("business_id", data.businessId);
    if (data.rows.length > 0) {
      const { error } = await supabase
        .from("business_availability")
        .insert(data.rows.map((r) => ({ business_id: data.businessId, ...r })) as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ---------- OWNER: exceptions ---------- */

export const upsertException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        closed: z.boolean().default(true),
        start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        note: z.string().max(200).nullable().optional(),
      })
      .refine(
        (v) => (v.start_time && v.end_time ? v.end_time > v.start_time : !v.start_time && !v.end_time),
        { message: "Time range must include both start and end, and end must be after start." },
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_availability_exceptions")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("business_availability_exceptions")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_availability_exceptions")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- OWNER: bookings inbox ---------- */

export const listOwnerBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { data: rows, error } = await supabase
      .from("business_bookings")
      .select("*")
      .eq("business_id", data.businessId)
      .order("starts_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { bookings: rows ?? [] };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_bookings")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Slot computation lives in ./business-bookings-slots (client-safe).
