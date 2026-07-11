import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  MailOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MessageComposer, type MessagePayload } from "@/components/messaging/message-composer";
import { AttachmentBubble } from "@/components/messaging/attachment-bubble";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

interface MessageRow {
  id: string;
  body: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  listing_id: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "video" | "gif" | null;
  attachment_thumb_url: string | null;
  attachment_path: string | null;
  attachment_meta: Record<string, unknown> | null;
}

interface ConversationSummary {
  key: string;
  listing_id: string;
  other_user_id: string;
  listing_title: string;
  listing_thumb: string | null;
  other_name: string;
  other_avatar: string | null;
  last_body: string;
  last_at: string;
  unread: number;
}

function attachmentPreview(m: MessageRow): string {
  if (m.body && m.body.trim()) return m.body;
  if (m.attachment_type === "image") return "📷 Photo";
  if (m.attachment_type === "video") return "🎬 Video";
  if (m.attachment_type === "gif") return "GIF";
  return "";
}

function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [listingsById, setListingsById] = useState<
    Record<string, { title: string; user_id: string; thumb: string | null }>
  >({});
  const [profilesById, setProfilesById] = useState<
    Record<
      string,
      { full_name: string | null; business_name: string | null; avatar_url: string | null }
    >
  >({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select(
        "id,body,created_at,sender_id,recipient_id,listing_id,read_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
      )
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = ((data ?? []) as MessageRow[])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    setMessages(rows);

    const listingIds = Array.from(new Set(rows.map((m) => m.listing_id)));
    const userIds = Array.from(
      new Set(rows.flatMap((m) => [m.sender_id, m.recipient_id]).filter((id) => id !== user.id)),
    );
    if (listingIds.length) {
      const [{ data: ls }, { data: media }] = await Promise.all([
        supabase.from("listings").select("id,title,user_id").in("id", listingIds),
        supabase
          .from("listing_media")
          .select("listing_id,url,type,sort_order")
          .in("listing_id", listingIds)
          .eq("type", "photo")
          .order("sort_order", { ascending: true }),
      ]);
      const thumbMap: Record<string, string> = {};
      (media ?? []).forEach((row: any) => {
        if (!thumbMap[row.listing_id]) thumbMap[row.listing_id] = row.url;
      });
      const map: Record<string, { title: string; user_id: string; thumb: string | null }> = {};
      (ls ?? []).forEach(
        (l: any) => (map[l.id] = { title: l.title, user_id: l.user_id, thumb: thumbMap[l.id] ?? null }),
      );
      setListingsById(map);
    }
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("public_profiles")
        .select("id,full_name,business_name,avatar_url")
        .in("id", userIds);
      const map: Record<
        string,
        { full_name: string | null; business_name: string | null; avatar_url: string | null }
      > = {};
      (ps ?? []).forEach(
        (p: any) =>
          (map[p.id] = {
            full_name: p.full_name,
            business_name: p.business_name,
            avatar_url: p.avatar_url ?? null,
          }),
      );
      setProfilesById(map);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    if (!user) return [];
    const map = new Map<string, ConversationSummary>();
    for (const m of messages) {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const key = `${m.listing_id}:${otherId}`;
      const existing = map.get(key);
      const profile = profilesById[otherId];
      const name = profile?.business_name ?? profile?.full_name ?? "Unknown user";
      const listing = listingsById[m.listing_id];
      const title = listing?.title ?? "Listing";
      const thumb = listing?.thumb ?? null;
      const unreadInc = m.recipient_id === user.id && !m.read_at ? 1 : 0;
      const preview = attachmentPreview(m);
      if (!existing) {
        map.set(key, {
          key,
          listing_id: m.listing_id,
          other_user_id: otherId,
          listing_title: title,
          listing_thumb: thumb,
          other_name: name,
          other_avatar: profile?.avatar_url ?? null,
          last_body: preview,
          last_at: m.created_at,
          unread: unreadInc,
        });
      } else {
        existing.last_body = preview;
        existing.last_at = m.created_at;
        existing.unread += unreadInc;
        existing.listing_title = title;
        existing.listing_thumb = thumb;
        existing.other_name = name;
        existing.other_avatar = profile?.avatar_url ?? null;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
  }, [messages, listingsById, profilesById, user]);

  useEffect(() => {
    if (!activeKey && conversations.length) setActiveKey(conversations[0].key);
  }, [conversations, activeKey]);

  const activeConvo = conversations.find((c) => c.key === activeKey);
  const thread = useMemo(() => {
    if (!activeConvo || !user) return [];
    return messages.filter(
      (m) =>
        m.listing_id === activeConvo.listing_id &&
        (m.sender_id === activeConvo.other_user_id ||
          m.recipient_id === activeConvo.other_user_id) &&
        (m.sender_id === user.id || m.recipient_id === user.id),
    );
  }, [messages, activeConvo, user]);

  useEffect(() => {
    if (!user || !activeConvo) return;
    const unreadIds = thread
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m,
          ),
        );
      });
  }, [thread, user, activeConvo]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread.length, activeKey]);

  const markAsUnread = async (c: ConversationSummary) => {
    const { error } = await supabase.rpc("mark_conversation_unread", {
      p_listing_id: c.listing_id,
      p_other_user_id: c.other_user_id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as unread");
      load();
    }
  };

  const markAsRead = async (c: ConversationSummary) => {
    if (!user) return;
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("listing_id", c.listing_id)
      .eq("recipient_id", user.id)
      .eq("sender_id", c.other_user_id)
      .is("read_at", null);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as read");
      load();
    }
  };

  const sendReply = async (payload: MessagePayload) => {
    if (!user || !activeConvo) return;
    if (!payload.body.trim() && !payload.attachment) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      listing_id: activeConvo.listing_id,
      sender_id: user.id,
      recipient_id: activeConvo.other_user_id,
      body: payload.body.trim() || null,
      attachment_url: payload.attachment?.url ?? null,
      attachment_type: payload.attachment?.type ?? null,
      attachment_thumb_url: payload.attachment?.thumbUrl ?? null,
      attachment_path: payload.attachment?.path ?? null,
      attachment_meta: (payload.attachment?.meta ?? null) as any,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    load();
  };

  const Avatar = ({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) => {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return url ? (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    ) : (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
      >
        {initial}
      </div>
    );
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Messages</h1>
      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-8 w-8" />
          No conversations yet. Messages from buyers will show up here.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div
            className={`overflow-hidden rounded-xl border border-border bg-card ${activeKey ? "hidden lg:block" : "block"}`}
          >
            <div className="max-h-[70dvh] divide-y divide-border overflow-y-auto">
              {conversations.map((c) => (
                <div
                  key={c.key}
                  className={`group relative flex w-full items-start gap-3 p-3 transition-colors ${
                    c.key === activeKey ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <button
                    onClick={() => setActiveKey(c.key)}
                    className="relative flex flex-1 items-start gap-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <Avatar url={c.other_avatar} name={c.other_name} size={44} />
                      {c.listing_thumb && (
                        <img
                          src={c.listing_thumb}
                          alt=""
                          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md border-2 border-card object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`truncate text-sm ${c.unread > 0 ? "font-bold" : "font-medium"}`}
                        >
                          {c.other_name}
                        </div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDate(c.last_at)}
                        </div>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Re: {c.listing_title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div
                          className={`line-clamp-1 flex-1 text-xs ${c.unread > 0 ? "font-semibold text-foreground" : "text-foreground/70"}`}
                        >
                          {c.last_body}
                        </div>
                        {c.unread > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Conversation options"
                        className="rounded-full p-1 text-muted-foreground opacity-0 hover:bg-secondary group-hover:opacity-100 focus:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {c.unread > 0 ? (
                        <DropdownMenuItem onClick={() => markAsRead(c)}>
                          <CheckCheck className="mr-2 h-4 w-4" /> Mark as read
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => markAsUnread(c)}>
                          <MailOpen className="mr-2 h-4 w-4" /> Mark as unread
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/listing/$id" params={{ id: c.listing_id }}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Open listing
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card ${activeKey ? "flex" : "hidden lg:flex"}`}
          >
            {activeConvo ? (
              <>
                <div className="flex items-start gap-3 border-b border-border p-3">
                  <button
                    type="button"
                    onClick={() => setActiveKey(null)}
                    className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar url={activeConvo.other_avatar} name={activeConvo.other_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{activeConvo.other_name}</div>
                    <Link
                      to="/listing/$id"
                      params={{ id: activeConvo.listing_id }}
                      className="flex items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-primary"
                    >
                      {activeConvo.listing_thumb && (
                        <img
                          src={activeConvo.listing_thumb}
                          alt=""
                          className="h-4 w-4 rounded object-cover"
                        />
                      )}
                      <span className="truncate">Re: {activeConvo.listing_title}</span>
                    </Link>
                  </div>
                </div>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[55dvh]">
                  {thread.map((m) => {
                    const mine = m.sender_id === user?.id;
                    const hasAttachment = !!m.attachment_type;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                          {hasAttachment && (
                            <AttachmentBubble
                              type={m.attachment_type as "image" | "video" | "gif"}
                              url={m.attachment_url}
                              path={m.attachment_path}
                              meta={(m.attachment_meta as { width?: number; height?: number } | null) ?? null}
                            />
                          )}
                          <div
                            className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(m.created_at).toLocaleString("en-PH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border p-3">
                  <MessageComposer
                    onSend={sendReply}
                    sending={sending}
                    placeholder="Write a reply…"
                  />
                </div>
              </>
            ) : (
              <div className="hidden p-12 text-center text-muted-foreground lg:block">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
