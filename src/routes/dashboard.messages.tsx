import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

interface MessageRow {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  listing_id: string;
  read_at: string | null;
}

interface ConversationSummary {
  key: string;
  listing_id: string;
  other_user_id: string;
  listing_title: string;
  other_name: string;
  last_body: string;
  last_at: string;
  unread: number;
}

function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [listingsById, setListingsById] = useState<Record<string, { title: string; user_id: string }>>({});
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string | null; business_name: string | null }>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id,body,created_at,sender_id,recipient_id,listing_id,read_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(500);
    const rows = (data ?? []) as MessageRow[];
    setMessages(rows);

    const listingIds = Array.from(new Set(rows.map((m) => m.listing_id)));
    const userIds = Array.from(
      new Set(rows.flatMap((m) => [m.sender_id, m.recipient_id]).filter((id) => id !== user.id)),
    );
    if (listingIds.length) {
      const { data: ls } = await supabase.from("listings").select("id,title,user_id").in("id", listingIds);
      const map: Record<string, { title: string; user_id: string }> = {};
      (ls ?? []).forEach((l: any) => (map[l.id] = { title: l.title, user_id: l.user_id }));
      setListingsById(map);
    }
    if (userIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name,business_name").in("id", userIds);
      const map: Record<string, { full_name: string | null; business_name: string | null }> = {};
      (ps ?? []).forEach((p: any) => (map[p.id] = { full_name: p.full_name, business_name: p.business_name }));
      setProfilesById(map);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  // Realtime subscription
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
      const title = listingsById[m.listing_id]?.title ?? "Listing";
      const unreadInc = m.recipient_id === user.id && !m.read_at ? 1 : 0;
      if (!existing) {
        map.set(key, {
          key,
          listing_id: m.listing_id,
          other_user_id: otherId,
          listing_title: title,
          other_name: name,
          last_body: m.body,
          last_at: m.created_at,
          unread: unreadInc,
        });
      } else {
        existing.last_body = m.body;
        existing.last_at = m.created_at;
        existing.unread += unreadInc;
        existing.listing_title = title;
        existing.other_name = name;
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
        (m.sender_id === activeConvo.other_user_id || m.recipient_id === activeConvo.other_user_id) &&
        (m.sender_id === user.id || m.recipient_id === user.id),
    );
  }, [messages, activeConvo, user]);

  // Mark active thread read
  useEffect(() => {
    if (!user || !activeConvo) return;
    const unreadIds = thread.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m)),
        );
      });
  }, [thread, user, activeConvo]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread.length, activeKey]);

  const sendReply = async () => {
    if (!user || !activeConvo || !reply.trim()) return;
    setSending(true);
    const body = reply.trim();
    const { error } = await supabase.from("messages").insert({
      listing_id: activeConvo.listing_id,
      sender_id: user.id,
      recipient_id: activeConvo.other_user_id,
      body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReply("");
    load();
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
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className={`overflow-hidden rounded-xl border border-border bg-card ${activeKey ? "hidden lg:block" : "block"}`}>
            <div className="max-h-[70dvh] divide-y divide-border overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveKey(c.key)}
                  className={`block w-full p-3 text-left transition-colors ${
                    c.key === activeKey ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{c.other_name}</div>
                    {c.unread > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">Re: {c.listing_title}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-foreground/70">{c.last_body}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{formatDate(c.last_at)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card ${activeKey ? "flex" : "hidden lg:flex"}`}>
            {activeConvo ? (
              <>
                <div className="flex items-start gap-2 border-b border-border p-4">
                  <button
                    type="button"
                    onClick={() => setActiveKey(null)}
                    className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{activeConvo.other_name}</div>
                    <Link
                      to="/listing/$id"
                      params={{ id: activeConvo.listing_id }}
                      className="block truncate text-xs text-muted-foreground hover:text-primary"
                    >
                      Re: {activeConvo.listing_title}
                    </Link>
                  </div>
                </div>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[55dvh]">
                  {thread.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden p-12 text-center text-muted-foreground lg:block">Select a conversation</div>
            )}
          </div>
        </div>

      )}
    </div>
  );
}
