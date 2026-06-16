import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns notification counts + recent items for a business workspace.
 * "Unread" is derived from existing status fields:
 *  - tow_requests:      status in ('open','accepted') and created in last 7d
 *  - business_inquiries: status = 'new'
 *  - business_bookings:  status = 'pending'
 *  - messages:           recipient_id = owner and read_at IS NULL
 */
export const getWorkspaceNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const businessId = data.businessId;

    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle();
    const ownerId = biz?.owner_id ?? null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [towRes, inqRes, bookRes, msgRes] = await Promise.all([
      ownerId
        ? supabase
            .from("tow_requests")
            .select("id,vehicle_summary,pickup_city,status,urgency,created_at")
            .eq("provider_id", ownerId)
            .in("status", ["open", "accepted"])
            .gte("created_at", sevenDaysAgo)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as any[] } as any),
      supabase
        .from("business_inquiries")
        .select("id,name,message,created_at,status")
        .eq("business_id", businessId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("business_bookings")
        .select("id,customer_name,starts_at,created_at,status")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
      ownerId
        ? supabase
            .from("messages")
            .select("id,body,created_at,listing_id,sender_id")
            .eq("recipient_id", ownerId)
            .is("read_at", null)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

    return {
      tow: towRes.data ?? [],
      inquiries: inqRes.data ?? [],
      bookings: bookRes.data ?? [],
      messages: msgRes.data ?? [],
      ownerId,
    };
  });
