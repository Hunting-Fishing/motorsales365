import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public, anonymous reputation stats for a seller.
 * Used to render the "Documents Checked" and "Responds Fast" badges on
 * listing/seller cards without exposing PII.
 */
export const getSellerReputationStats = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ sellerId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Documents Checked — at least one approved vehicle passport verification.
    const { count: documentsVerifiedCount } = await supabaseAdmin
      .from("vehicle_passport_verifications")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by", data.sellerId)
      .eq("status", "approved");

    // Responds Fast — at least 5 inbound buyer messages and ≥70% were
    // marked read within 60 minutes of arriving. Uses read_at as a proxy
    // because we don't store explicit reply timestamps.
    const { data: inbound } = await supabaseAdmin
      .from("messages")
      .select("created_at, read_at")
      .eq("recipient_id", data.sellerId)
      .order("created_at", { ascending: false })
      .limit(50);

    let fastResponse = false;
    if (inbound && inbound.length >= 5) {
      const fast = inbound.filter((m: any) => {
        if (!m.read_at) return false;
        const dt = new Date(m.read_at).getTime() - new Date(m.created_at).getTime();
        return dt >= 0 && dt <= 60 * 60 * 1000;
      }).length;
      fastResponse = fast / inbound.length >= 0.7;
    }

    return {
      documents_verified_count: documentsVerifiedCount ?? 0,
      fast_response: fastResponse,
    };
  });
