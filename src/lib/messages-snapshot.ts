import { supabase } from "@/integrations/supabase/client";

export type AttachType = "image" | "video" | "gif" | null;
export interface DmRow {
  id: string;
  body: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  listing_id: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: AttachType;
  attachment_thumb_url: string | null;
  attachment_path: string | null;
  attachment_meta: Record<string, unknown> | null;
  is_offer?: boolean;
  offer_amount?: number | null;
  offer_currency?: string | null;
  offer_status?: string | null;
  system_kind?: string | null;
}
export interface GroupMsg {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_type: AttachType;
  attachment_thumb_url: string | null;
  attachment_path: string | null;
  attachment_meta: Record<string, unknown> | null;
}
export interface GroupThread {
  id: string;
  title: string;
  created_by: string;
  updated_at: string;
}
export interface GroupMember {
  thread_id: string;
  user_id: string;
  status: "invited" | "active" | "left";
}
export interface MyMembership {
  thread_id: string;
  status: "invited" | "active" | "left";
  last_read_at: string | null;
}
export interface ListingSummary {
  title: string;
  user_id: string;
  thumb: string | null;
  price_php: number | null;
  status: string | null;
}
export interface ProfileSummary {
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
}
export interface MessagesSnapshot {
  dms: DmRow[];
  groupMsgs: GroupMsg[];
  groupThreads: Record<string, GroupThread>;
  groupMembers: GroupMember[];
  myMemberships: Record<string, MyMembership>;
  listingsById: Record<string, ListingSummary>;
  profilesById: Record<string, ProfileSummary>;
}
export const MESSAGES_LOAD_FAILURE =
  "Could not load current messages. Refresh messages to try again.";

// This remains a browser/RLS reader, not a new caller-bound authority API or a
// transactionally consistent/full-history snapshot. Keep the existing caps.
export async function readMessagesSnapshot(
  accountId: string,
  signal: AbortSignal,
  isCurrent: () => boolean,
): Promise<MessagesSnapshot> {
  const check = () => {
    if (signal.aborted || !isCurrent()) throw new Error(MESSAGES_LOAD_FAILURE);
  };
  const from = (table: string) => {
    check();
    // Ungenerated native chat tables retain their existing narrow projections.
    return supabase.from(table as never) as any;
  };
  const read = async <T>(query: any): Promise<T[]> => {
    check();
    const result = await query.abortSignal(signal).retry(false);
    check();
    if (result.error || !Array.isArray(result.data)) throw new Error(MESSAGES_LOAD_FAILURE);
    return result.data as T[];
  };
  try {
    check();
    const [dms, myMems] = await Promise.all([
      read<DmRow>(
        from("messages")
          .select(
            "id,body,created_at,sender_id,recipient_id,listing_id,read_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta,is_offer,offer_amount,offer_currency,offer_status,system_kind",
          )
          .or(`sender_id.eq.${accountId},recipient_id.eq.${accountId}`)
          .order("created_at", { ascending: false })
          .limit(500),
      ),
      read<MyMembership>(
        from("chat_thread_members")
          .select("thread_id,status,last_read_at")
          .eq("user_id", accountId)
          .in("status", ["active", "invited"]),
      ),
    ]);
    check();
    const threadIds = [...new Set(myMems.map((m) => m.thread_id))];
    const [groupMsgs, threads, groupMembers] = threadIds.length
      ? await Promise.all([
          read<GroupMsg>(
            from("chat_thread_messages")
              .select(
                "id,thread_id,sender_id,body,created_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
              )
              .in("thread_id", threadIds)
              .order("created_at", { ascending: true })
              .limit(1000),
          ),
          read<GroupThread>(
            from("chat_threads").select("id,title,created_by,updated_at").in("id", threadIds),
          ),
          read<GroupMember>(
            from("chat_thread_members")
              .select("thread_id,user_id,status")
              .in("thread_id", threadIds),
          ),
        ])
      : [[], [], []];
    check();
    const listingIds = [...new Set(dms.map((m) => m.listing_id))];
    const userIds = [
      ...new Set([
        ...dms.flatMap((m) => [m.sender_id, m.recipient_id]),
        ...groupMsgs.map((m) => m.sender_id),
        ...groupMembers.map((m) => m.user_id),
        ...threads.map((t) => t.created_by),
      ]),
    ].filter((id) => id && id !== accountId);
    const listingsById: MessagesSnapshot["listingsById"] = {};
    const profilesById: MessagesSnapshot["profilesById"] = {};
    if (listingIds.length) {
      const [listings, media] = await Promise.all([
        read<{
          id: string;
          title: string;
          user_id: string;
          price_php: number | null;
          status: string | null;
        }>(from("listings").select("id,title,user_id,price_php,status").in("id", listingIds)),
        read<{ listing_id: string; url: string }>(
          from("listing_media")
            .select("listing_id,url,type,sort_order")
            .in("listing_id", listingIds)
            .eq("type", "photo")
            .order("sort_order", { ascending: true }),
        ),
      ]);
      check();
      const thumbs: Record<string, string> = {};
      media.forEach((row) => {
        thumbs[row.listing_id] ??= row.url;
      });
      listings.forEach((row) => {
        listingsById[row.id] = {
          title: row.title,
          user_id: row.user_id,
          price_php: row.price_php ?? null,
          status: row.status ?? null,
          thumb: thumbs[row.id] ?? null,
        };
      });
    }
    check();
    if (userIds.length) {
      const profiles = await read<{ id: string } & ProfileSummary>(
        from("public_profiles").select("id,full_name,business_name,avatar_url").in("id", userIds),
      );
      profiles.forEach((row) => {
        profilesById[row.id] = {
          full_name: row.full_name,
          business_name: row.business_name,
          avatar_url: row.avatar_url ?? null,
        };
      });
    }
    check();
    return {
      dms: dms.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
      groupMsgs,
      groupMembers,
      groupThreads: Object.fromEntries(threads.map((t) => [t.id, t])),
      myMemberships: Object.fromEntries(myMems.map((m) => [m.thread_id, m])),
      listingsById,
      profilesById,
    };
  } catch {
    throw new Error(MESSAGES_LOAD_FAILURE);
  }
}
