import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffDmConversation = {
  other_user_id: string;
  other_name: string | null;
  other_email: string | null;
  other_avatar_url: string | null;
  last_body: string;
  last_at: string;
  last_from_me: boolean;
  unread_count: number;
};

/**
 * Returns the current @365 staff user's DM conversations, grouped by the
 * other participant, with unread counts (messages sent to me, not yet read).
 */
export const listStaffDmConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffDmConversation[]> => {
    const { supabase, userId, claims } = context;
    const email = (claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (!email.endsWith("@365motorsales.com")) {
      throw new Error("Not permitted");
    }

    const { data: msgs, error } = await supabase
      .from("staff_dms")
      .select("id,sender_id,recipient_id,body,created_at,read_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      sender_id: string;
      recipient_id: string;
      body: string;
      created_at: string;
      read_at: string | null;
    };
    const grouped = new Map<string, StaffDmConversation>();
    for (const m of (msgs ?? []) as Row[]) {
      const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
      let conv = grouped.get(other);
      if (!conv) {
        conv = {
          other_user_id: other,
          other_name: null,
          other_email: null,
          other_avatar_url: null,
          last_body: m.body,
          last_at: m.created_at,
          last_from_me: m.sender_id === userId,
          unread_count: 0,
        };
        grouped.set(other, conv);
      }
      if (m.recipient_id === userId && !m.read_at) conv.unread_count += 1;
    }

    const otherIds = Array.from(grouped.keys());
    if (otherIds.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, ...userLookups] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", otherIds),
      ...otherIds.map((id) => supabaseAdmin.auth.admin.getUserById(id)),
    ]);

    const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    for (const p of (profiles ?? []) as any[]) {
      profileById.set(p.id, { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null });
    }
    const emailById = new Map<string, string | null>();
    userLookups.forEach((u: any, i: number) => {
      emailById.set(otherIds[i], u?.data?.user?.email ?? null);
    });

    for (const [id, conv] of grouped) {
      const p = profileById.get(id);
      conv.other_name = p?.full_name ?? null;
      conv.other_avatar_url = p?.avatar_url ?? null;
      conv.other_email = emailById.get(id) ?? null;
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
    );
  });
