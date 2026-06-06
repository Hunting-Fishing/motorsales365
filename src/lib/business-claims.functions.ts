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
        "id,business_id,claimant_user_id,contact_method,contact_value,evidence_url,notes,status,created_at,businesses(name,slug,city,region,phone,email)",
      )
      .in("status", ["pending"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { claims: data ?? [] };
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
    return { claims: rows ?? [] };
  });
