// Business claim flow: users submit a claim for an unclaimed business; auto-approve
// when the contact value matches the listed contact, otherwise queue for staff.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const SubmitInput = z.object({
  businessId: z.string().uuid(),
  contactMethod: z.enum(["email", "phone", "document", "social"]),
  contactValue: z.string().min(1).max(500).optional(),
  evidenceUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

function normEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}
function normPhone(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "").replace(/^0+/, "").slice(-10);
}

export const submitBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id,name,email,phone,owner_id,claim_state")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bizErr) throw new Error(bizErr.message);
    if (!biz) throw new Error("Business not found");
    if (biz.owner_id || biz.claim_state === "owned") {
      throw new Error("This business has already been claimed.");
    }

    // Auto-verify path: match against listed contact + the user's auth profile
    const { data: authData } = await supabase.auth.getUser();
    const me = authData?.user;
    let autoApprove = false;
    if (data.contactMethod === "email" && data.contactValue) {
      const inputEmail = normEmail(data.contactValue);
      const userEmail = normEmail(me?.email);
      const listedEmail = normEmail(biz.email);
      autoApprove =
        !!listedEmail && inputEmail === listedEmail && userEmail === listedEmail && !!me?.email_confirmed_at;
    } else if (data.contactMethod === "phone" && data.contactValue) {
      const inputPhone = normPhone(data.contactValue);
      const userPhone = normPhone(me?.phone);
      const listedPhone = normPhone(biz.phone);
      autoApprove =
        !!listedPhone &&
        inputPhone === listedPhone &&
        userPhone === listedPhone &&
        !!me?.phone_confirmed_at;
    }

    const { data: claim, error: insErr } = await supabase
      .from("business_claim_requests")
      .insert({
        business_id: data.businessId,
        claimant_user_id: userId,
        contact_method: data.contactMethod,
        contact_value: data.contactValue ?? null,
        evidence_url: data.evidenceUrl ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    if (autoApprove) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: approveErr } = await supabaseAdmin.rpc("approve_business_claim", {
        _claim_id: claim.id,
        _auto: true,
      });
      if (approveErr) throw new Error(approveErr.message);
      return { id: claim.id, autoApproved: true };
    }

    // Otherwise: mark business as claim_pending so subsequent visitors see status
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("businesses")
      .update({ claim_state: "claim_pending" })
      .eq("id", data.businessId)
      .eq("claim_state", "unclaimed");

    return { id: claim.id, autoApproved: false };
  });

const ReviewInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().max(2000).optional(),
});

export const reviewBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("can_moderate", { _user_id: userId });
    if (!ok) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.decision === "approve") {
      const { error } = await supabaseAdmin.rpc("approve_business_claim", {
        _claim_id: data.id,
        _auto: false,
      });
      if (error) throw new Error(error.message);
      await supabaseAdmin
        .from("business_claim_requests")
        .update({ reviewer_user_id: userId, reviewer_notes: data.notes ?? null })
        .eq("id", data.id);
    } else {
      const { data: claim } = await supabaseAdmin
        .from("business_claim_requests")
        .select("business_id")
        .eq("id", data.id)
        .single();
      await supabaseAdmin
        .from("business_claim_requests")
        .update({
          status: "rejected",
          reviewer_user_id: userId,
          reviewer_notes: data.notes ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      // Restore to unclaimed if no other pending claims remain
      if (claim?.business_id) {
        const { count } = await supabaseAdmin
          .from("business_claim_requests")
          .select("id", { count: "exact", head: true })
          .eq("business_id", claim.business_id)
          .eq("status", "pending");
        if (!count) {
          await supabaseAdmin
            .from("businesses")
            .update({ claim_state: "unclaimed" })
            .eq("id", claim.business_id)
            .eq("claim_state", "claim_pending");
        }
      }
    }
    return { ok: true };
  });

export const listPendingClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("can_moderate", { _user_id: userId });
    if (!ok) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("business_claim_requests")
      .select(
        "id,business_id,claimant_user_id,contact_method,contact_value,evidence_url,notes,status,kind,created_at,businesses(name,slug,city,region,phone,email,owner_id)",
      )
      .in("status", ["pending"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const claims = data ?? [];
    if (claims.length === 0) {
      return { claims: [], evidenceByClaim: {}, claimantById: {} };
    }

    const claimIds = claims.map((c) => c.id);
    const claimantIds = Array.from(new Set(claims.map((c) => c.claimant_user_id)));

    const { data: evidence } = await supabase
      .from("business_claim_evidence")
      .select(
        "id,claim_id,evidence_type,file_name,file_size,mime_type,storage_path,notes,created_at,uploader_user_id",
      )
      .in("claim_id", claimIds)
      .order("created_at", { ascending: true });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,first_name,last_name,avatar_url,phone,created_at")
      .in("id", claimantIds);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimantById: Record<
      string,
      {
        id: string;
        email: string | null;
        email_confirmed: boolean;
        phone: string | null;
        phone_confirmed: boolean;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string | null;
      }
    > = {};

    for (const cid of claimantIds) {
      const prof = profiles?.find((p) => p.id === cid);
      const { data: au } = await supabaseAdmin.auth.admin.getUserById(cid);
      const user = au?.user;
      claimantById[cid] = {
        id: cid,
        email: user?.email ?? null,
        email_confirmed: !!user?.email_confirmed_at,
        phone: user?.phone ?? prof?.phone ?? null,
        phone_confirmed: !!user?.phone_confirmed_at,
        full_name:
          prof?.full_name ||
          [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") ||
          null,
        avatar_url: prof?.avatar_url ?? null,
        created_at: prof?.created_at ?? user?.created_at ?? null,
      };
    }

    const evidenceByClaim: Record<string, typeof evidence> = {};
    for (const e of evidence ?? []) {
      (evidenceByClaim[e.claim_id] ||= []).push(e);
    }

    return { claims, evidenceByClaim, claimantById };
  });

export type AuditEntry = {
  id: string;
  claim_id: string;
  actor_user_id: string | null;
  action:
    | "submitted"
    | "resubmitted"
    | "approved"
    | "auto_approved"
    | "rejected"
    | "evidence_added"
    | "evidence_removed"
    | "reviewer_note";
  notes: string | null;
  details: Record<string, any>;
  created_at: string;
};

export const getClaimAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { claimId: string }) =>
    z.object({ claimId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("business_claim_audit")
      .select("id,claim_id,actor_user_id,action,notes,details,created_at")
      .eq("claim_id", data.claimId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r) => r.actor_user_id).filter((x): x is string => !!x)),
    );

    const actorById: Record<string, { id: string; name: string | null; email: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,first_name,last_name")
        .in("id", actorIds);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const id of actorIds) {
        const p = profs?.find((x) => x.id === id);
        const { data: au } = await supabaseAdmin.auth.admin.getUserById(id);
        actorById[id] = {
          id,
          name:
            p?.full_name ||
            [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
            null,
          email: au?.user?.email ?? null,
        };
      }
    }

    return { entries: (rows ?? []) as AuditEntry[], actorById };
  });




export const getMyClaimForBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_claim_requests")
      .select("id,status,reviewer_notes,decided_at,created_at,contact_method,contact_value,evidence_url,notes")
      .eq("business_id", data.businessId)
      .eq("claimant_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { claim: row ?? null };
  });

const ResubmitInput = z.object({
  claimId: z.string().uuid(),
  contactMethod: z.enum(["email", "phone", "document", "social"]).optional(),
  contactValue: z.string().min(1).max(500).optional(),
  evidenceUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const resubmitBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: findErr } = await supabase
      .from("business_claim_requests")
      .select("id,business_id,status,claimant_user_id")
      .eq("id", data.claimId)
      .single();
    if (findErr) throw new Error(findErr.message);
    if (!existing) throw new Error("Claim not found");
    if (existing.claimant_user_id !== userId) throw new Error("Forbidden");
    if (existing.status !== "rejected") throw new Error("Only rejected claims can be resubmitted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const update: Database["public"]["Tables"]["business_claim_requests"]["Update"] = {
      status: "pending",
      decided_at: null,
      reviewer_notes: null,
      reviewer_user_id: null,
    };
    if (data.contactMethod !== undefined) update.contact_method = data.contactMethod;
    if (data.contactValue !== undefined) update.contact_value = data.contactValue || null;
    if (data.evidenceUrl !== undefined) update.evidence_url = data.evidenceUrl || null;
    if (data.notes !== undefined) update.notes = data.notes || null;

    const { error: updErr } = await supabaseAdmin
      .from("business_claim_requests")
      .update(update)
      .eq("id", data.claimId);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin
      .from("businesses")
      .update({ claim_state: "claim_pending" })
      .eq("id", existing.business_id)
      .eq("claim_state", "unclaimed");

    return { ok: true };
  });

export const getMyClaimsForBusiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("business_claim_requests")
      .select(
        "id,status,reviewer_notes,decided_at,created_at,updated_at,contact_method,contact_value,evidence_url,notes",
      )
      .eq("business_id", data.businessId)
      .eq("claimant_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const claims = rows ?? [];
    if (claims.length === 0) return { claims: [], evidenceByClaim: {} as Record<string, EvidenceRow[]> };

    const ids = claims.map((c) => c.id);
    const { data: ev } = await supabase
      .from("business_claim_evidence")
      .select("id,claim_id,evidence_type,file_name,file_size,mime_type,storage_path,notes,created_at")
      .in("claim_id", ids)
      .order("created_at", { ascending: true });

    const evidenceByClaim: Record<string, EvidenceRow[]> = {};
    for (const e of ev ?? []) {
      (evidenceByClaim[e.claim_id] ||= []).push(e as EvidenceRow);
    }
    return { claims, evidenceByClaim };
  });

// ---------- Evidence uploads (receipt-style) ----------

const EVIDENCE_TYPES = [
  "facebook_ownership",
  "google_business",
  "business_license",
  "utility_bill",
  "id_document",
  "website_proof",
  "other",
] as const;

export type EvidenceRow = {
  id: string;
  claim_id: string;
  evidence_type: (typeof EVIDENCE_TYPES)[number];
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
};

const RecordEvidenceInput = z.object({
  claimId: z.string().uuid(),
  evidenceType: z.enum(EVIDENCE_TYPES),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(0).max(25 * 1024 * 1024),
  mimeType: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1024),
  notes: z.string().max(1000).optional(),
});

export const recordClaimEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RecordEvidenceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify the user owns this claim
    const { data: claim, error: claimErr } = await supabase
      .from("business_claim_requests")
      .select("id,claimant_user_id")
      .eq("id", data.claimId)
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claim || claim.claimant_user_id !== userId) throw new Error("Forbidden");

    const { data: row, error } = await supabase
      .from("business_claim_evidence")
      .insert({
        claim_id: data.claimId,
        uploader_user_id: userId,
        evidence_type: data.evidenceType,
        file_name: data.fileName,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        storage_path: data.storagePath,
        notes: data.notes ?? null,
      })
      .select("id,claim_id,evidence_type,file_name,file_size,mime_type,storage_path,notes,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { evidence: row as EvidenceRow };
  });

export const getEvidenceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ evidenceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ev, error } = await supabase
      .from("business_claim_evidence")
      .select("storage_path")
      .eq("id", data.evidenceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ev) throw new Error("Not found");
    const { data: signed, error: sErr } = await supabase.storage
      .from("claim-evidence")
      .createSignedUrl(ev.storage_path, 60 * 5);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });

export const deleteClaimEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ evidenceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error } = await supabase
      .from("business_claim_evidence")
      .select("id,uploader_user_id,storage_path")
      .eq("id", data.evidenceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ev || ev.uploader_user_id !== userId) throw new Error("Forbidden");
    await supabase.storage.from("claim-evidence").remove([ev.storage_path]);
    const { error: delErr } = await supabase
      .from("business_claim_evidence")
      .delete()
      .eq("id", data.evidenceId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });
