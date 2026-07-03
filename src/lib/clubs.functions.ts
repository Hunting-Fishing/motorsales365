import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify, randomSuffix } from "./clubs.server";

const CLUB_TYPES = [
  "motorcycle_riding",
  "car_club",
  "off_road",
  "truck_club",
  "brand_owners",
  "general_motoring",
  "other",
] as const;

const DOC_KINDS = [
  "lto_accreditation",
  "sec_incorporation",
  "dti_business_permit",
  "other",
] as const;

const ApplyInput = z.object({
  name: z.string().trim().min(3).max(120),
  type: z.enum(CLUB_TYPES),
  description: z.string().trim().min(20).max(2000),
  region: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  website_url: z.string().trim().url().max(300).optional().nullable(),
  documents: z
    .array(
      z.object({
        kind: z.enum(DOC_KINDS),
        storage_path: z.string().min(3).max(500),
        original_filename: z.string().max(200).optional().nullable(),
      }),
    )
    .min(1, "At least one accreditation document is required.")
    .max(6),
});

export const applyForClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ApplyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const base = slugify(data.name) || "club";
    let slug = `${base}-${randomSuffix(5)}`;
    for (let i = 0; i < 4; i++) {
      const { data: existing } = await supabase
        .from("clubs" as never)
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${base}-${randomSuffix(5)}`;
    }

    const { data: created, error } = await supabase
      .from("clubs" as never)
      .insert({
        owner_id: userId,
        slug,
        name: data.name,
        type: data.type,
        description: data.description,
        region: data.region ?? null,
        city: data.city ?? null,
        logo_url: data.logo_url ?? null,
        cover_url: data.cover_url ?? null,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        website_url: data.website_url ?? null,
        status: "pending",
      } as never)
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    const club = created as unknown as { id: string; slug: string };
    const docRows = data.documents.map((d) => ({
      club_id: club.id,
      kind: d.kind,
      storage_path: d.storage_path,
      original_filename: d.original_filename ?? null,
      uploaded_by: userId,
    }));
    const { error: docErr } = await supabase.from("club_documents" as never).insert(docRows as never);
    if (docErr) throw new Error(docErr.message);
    return club;
  });

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("clubs" as never)
      .select("id,slug,name,type,status,verified,logo_url,cover_url,member_count,review_notes,region,city,created_at")
      .eq("owner_id", userId);
    const { data: memberships } = await supabase
      .from("club_members" as never)
      .select("club_id, role, status")
      .eq("user_id", userId)
      .eq("status", "active");
    const otherIds = ((memberships ?? []) as any[])
      .map((m) => m.club_id)
      .filter((id) => !(owned as any[])?.some((o) => o.id === id));
    let joined: any[] = [];
    if (otherIds.length) {
      const { data } = await supabase
        .from("clubs" as never)
        .select("id,slug,name,type,status,verified,logo_url,cover_url,member_count,region,city")
        .in("id", otherIds)
        .eq("status", "active");
      joined = (data ?? []) as any[];
      const roleMap = new Map(((memberships ?? []) as any[]).map((m) => [m.club_id, m.role]));
      joined = joined.map((c) => ({ ...c, my_role: roleMap.get(c.id) ?? "member" }));
    }
    return {
      owned: ((owned ?? []) as any[]).map((c) => ({ ...c, my_role: "owner" })),
      joined,
    };
  });

export const getMyClubDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: club } = await supabase
      .from("clubs" as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!club) throw new Error("Not found");
    const c = club as any;
    const isOwner = c.owner_id === userId;
    const { data: myMem } = await supabase
      .from("club_members" as never)
      .select("role,status")
      .eq("club_id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const myRole = isOwner
      ? "owner"
      : (myMem as any)?.status === "active"
        ? (myMem as any).role
        : null;
    if (!isOwner && myRole !== "owner" && myRole !== "admin") {
      // still allow member view but strip sensitive fields
      return { club: c, my_role: myRole, documents: [], members: [], pending_members: [], events: [] };
    }
    const [{ data: documents }, { data: members }, { data: events }] = await Promise.all([
      supabase
        .from("club_documents" as never)
        .select("id,kind,storage_path,original_filename,created_at")
        .eq("club_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("club_members" as never)
        .select("id,user_id,role,status,joined_at,created_at")
        .eq("club_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("club_events" as never)
        .select("id,title,starts_at,meetup_location,status,cover_url")
        .eq("club_id", data.id)
        .order("starts_at", { ascending: true }),
    ]);
    const memberList = ((members ?? []) as any[]);
    const uids = Array.from(new Set(memberList.map((m) => m.user_id)));
    let profs: any[] = [];
    if (uids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,business_name")
        .in("id", uids);
      profs = data ?? [];
    }
    const profMap = new Map(profs.map((p) => [p.id, p]));
    const enrichedMembers = memberList.map((m) => ({ ...m, profile: profMap.get(m.user_id) ?? null }));

    // Signed URLs for documents (1 hour)
    const docsWithUrls = await Promise.all(
      ((documents ?? []) as any[]).map(async (d) => {
        const { data: signed } = await supabase.storage
          .from("club-docs")
          .createSignedUrl(d.storage_path, 3600);
        return { ...d, signed_url: signed?.signedUrl ?? null };
      }),
    );

    return {
      club: c,
      my_role: myRole,
      documents: docsWithUrls,
      members: enrichedMembers.filter((m) => m.status === "active"),
      pending_members: enrichedMembers.filter((m) => m.status === "pending"),
      events: events ?? [],
    };
  });

export const requestJoinClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ club_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("club_members" as never)
      .select("id,status")
      .eq("club_id", data.club_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { status: (existing as any).status };
    const { error } = await supabase
      .from("club_members" as never)
      .insert({
        club_id: data.club_id,
        user_id: userId,
        role: "member",
        status: "pending",
      } as never);
    if (error) throw new Error(error.message);
    return { status: "pending" };
  });

export const respondToJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      member_id: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.decision === "approve") {
      const { error } = await supabase
        .from("club_members" as never)
        .update({ status: "active", joined_at: new Date().toISOString() } as never)
        .eq("id", data.member_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("club_members" as never)
        .delete()
        .eq("id", data.member_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const leaveClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ club_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("club_members" as never)
      .delete()
      .eq("club_id", data.club_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const EventInput = z.object({
  club_id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  starts_at: z.string(),
  ends_at: z.string().optional().nullable(),
  meetup_location: z.string().trim().max(300).optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
});

export const createClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EventInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("club_events" as never)
      .insert({
        club_id: data.club_id,
        created_by: userId,
        title: data.title,
        description: data.description ?? null,
        starts_at: data.starts_at,
        ends_at: data.ends_at ?? null,
        meetup_location: data.meetup_location ?? null,
        cover_url: data.cover_url ?? null,
      } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rsvpClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      event_id: z.string().uuid(),
      response: z.enum(["going", "maybe", "no"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("club_event_rsvps" as never)
      .upsert(
        { event_id: data.event_id, user_id: userId, response: data.response } as never,
        { onConflict: "event_id,user_id" } as any,
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const attachRideToClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ club_id: z.string().uuid(), ride_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("club_rides" as never)
      .insert({ club_id: data.club_id, ride_id: data.ride_id, added_by: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const detachRideFromClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("club_rides" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ADMIN
export const listPendingClubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: clubs } = await supabase
      .from("clubs" as never)
      .select("id,slug,name,type,region,city,contact_email,contact_phone,description,logo_url,cover_url,status,created_at,owner_id,review_notes")
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false });
    const list = (clubs ?? []) as any[];
    const ids = list.map((c) => c.id);
    let docsByClub = new Map<string, any[]>();
    if (ids.length) {
      const { data: docs } = await supabase
        .from("club_documents" as never)
        .select("id,club_id,kind,storage_path,original_filename")
        .in("club_id", ids);
      for (const d of (docs ?? []) as any[]) {
        const arr = docsByClub.get(d.club_id) ?? [];
        const { data: signed } = await supabase.storage
          .from("club-docs")
          .createSignedUrl(d.storage_path, 3600);
        arr.push({ ...d, signed_url: signed?.signedUrl ?? null });
        docsByClub.set(d.club_id, arr);
      }
    }
    return list.map((c) => ({ ...c, documents: docsByClub.get(c.id) ?? [] }));
  });

export const reviewClubApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      club_id: z.string().uuid(),
      decision: z.enum(["approve", "reject", "suspend"]),
      notes: z.string().max(1000).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const nextStatus =
      data.decision === "approve" ? "active" : data.decision === "reject" ? "rejected" : "suspended";
    const patch: Record<string, any> = {
      status: nextStatus,
      verified: data.decision === "approve",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: data.notes ?? null,
    };
    const { error } = await supabase
      .from("clubs" as never)
      .update(patch as never)
      .eq("id", data.club_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
