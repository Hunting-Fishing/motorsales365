import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  MailOpen,
  ExternalLink,
  Users,
  Plus,
  UserPlus,
  LogOut,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MessageComposer, type MessagePayload } from "@/components/messaging/message-composer";
import { AttachmentBubble } from "@/components/messaging/attachment-bubble";
import { NewGroupChatDialog } from "@/components/messaging/new-group-chat-dialog";
import { InviteToThreadDialog } from "@/components/messaging/invite-to-thread-dialog";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

type AttachType = "image" | "video" | "gif" | null;

interface DmRow {
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
}

interface GroupMsg {
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

interface GroupThread {
  id: string;
  title: string;
  created_by: string;
  updated_at: string;
}

interface GroupMember {
  thread_id: string;
  user_id: string;
  status: "invited" | "active" | "left";
}

interface MyMembership {
  thread_id: string;
  status: "invited" | "active" | "left";
  last_read_at: string | null;
}

interface ConversationSummary {
  key: string;
  kind: "dm" | "group";
  listing_id: string | null;
  thread_id: string | null;
  other_user_id: string | null;
  title: string;
  subtitle: string;
  thumb: string | null;
  avatar: string | null;
  last_body: string;
  last_at: string;
  unread: number;
  invited?: boolean;
}

function attachmentPreview(body: string | null, type: AttachType): string {
  if (body && body.trim()) return body;
  if (type === "image") return "📷 Photo";
  if (type === "video") return "🎬 Video";
  if (type === "gif") return "GIF";
  return "";
}

function MessagesPage() {
  const { user } = useAuth();
  const [dms, setDms] = useState<DmRow[]>([]);
  const [groupMsgs, setGroupMsgs] = useState<GroupMsg[]>([]);
  const [groupThreads, setGroupThreads] = useState<Record<string, GroupThread>>({});
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [myMemberships, setMyMemberships] = useState<Record<string, MyMembership>>({});

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
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    if (!user) return;

    const [dmRes, myMemRes] = await Promise.all([
      supabase
        .from("messages")
        .select(
          "id,body,created_at,sender_id,recipient_id,listing_id,read_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase.from("chat_thread_members" as any) as any)
        .select("thread_id,status,last_read_at")
        .eq("user_id", user.id)
        .in("status", ["active", "invited"]),
    ]);

    const dmRows = ((dmRes.data ?? []) as DmRow[])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    setDms(dmRows);

    const myMems = (myMemRes.data ?? []) as MyMembership[];
    const memMap: Record<string, MyMembership> = {};
    myMems.forEach((m) => (memMap[m.thread_id] = m));
    setMyMemberships(memMap);

    const threadIds = myMems.map((m) => m.thread_id);
    let allGroupMsgs: GroupMsg[] = [];
    let allMembers: GroupMember[] = [];
    let allThreads: GroupThread[] = [];
    if (threadIds.length) {
      const [msgRes, threadRes, memberRes] = await Promise.all([
        (supabase.from("chat_thread_messages" as any) as any)
          .select(
            "id,thread_id,sender_id,body,created_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
          )
          .in("thread_id", threadIds)
          .order("created_at", { ascending: true })
          .limit(1000),
        (supabase.from("chat_threads" as any) as any)
          .select("id,title,created_by,updated_at")
          .in("id", threadIds),
        (supabase.from("chat_thread_members" as any) as any)
          .select("thread_id,user_id,status")
          .in("thread_id", threadIds),
      ]);
      allGroupMsgs = (msgRes.data ?? []) as GroupMsg[];
      allThreads = (threadRes.data ?? []) as GroupThread[];
      allMembers = (memberRes.data ?? []) as GroupMember[];
    }
    setGroupMsgs(allGroupMsgs);
    setGroupMembers(allMembers);
    const threadMap: Record<string, GroupThread> = {};
    allThreads.forEach((t) => (threadMap[t.id] = t));
    setGroupThreads(threadMap);

    // Collect listing + user ids
    const listingIds = Array.from(new Set(dmRows.map((m) => m.listing_id)));
    const userIds = Array.from(
      new Set([
        ...dmRows.flatMap((m) => [m.sender_id, m.recipient_id]),
        ...allGroupMsgs.map((m) => m.sender_id),
        ...allMembers.map((m) => m.user_id),
        ...allThreads.map((t) => t.created_by),
      ]),
    ).filter((id) => id && id !== user.id);

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
        (l: any) =>
          (map[l.id] = { title: l.title, user_id: l.user_id, thumb: thumbMap[l.id] ?? null }),
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
    const ch = supabase
      .channel("dashboard-messages-and-groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_thread_messages" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_thread_members" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-open thread from ?thread= query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("thread");
    if (t) setActiveKey(`group:${t}`);
  }, []);

  const conversations = useMemo<ConversationSummary[]>(() => {
    if (!user) return [];
    const list: ConversationSummary[] = [];

    // DMs
    const dmMap = new Map<string, ConversationSummary>();
    for (const m of dms) {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const key = `dm:${m.listing_id}:${otherId}`;
      const existing = dmMap.get(key);
      const profile = profilesById[otherId];
      const name = profile?.business_name ?? profile?.full_name ?? "Unknown user";
      const listing = listingsById[m.listing_id];
      const title = listing?.title ?? "Listing";
      const thumb = listing?.thumb ?? null;
      const unreadInc = m.recipient_id === user.id && !m.read_at ? 1 : 0;
      const preview = attachmentPreview(m.body, m.attachment_type);
      if (!existing) {
        dmMap.set(key, {
          key,
          kind: "dm",
          listing_id: m.listing_id,
          thread_id: null,
          other_user_id: otherId,
          title: name,
          subtitle: `Re: ${title}`,
          thumb,
          avatar: profile?.avatar_url ?? null,
          last_body: preview,
          last_at: m.created_at,
          unread: unreadInc,
        });
      } else {
        existing.last_body = preview;
        existing.last_at = m.created_at;
        existing.unread += unreadInc;
        existing.title = name;
        existing.subtitle = `Re: ${title}`;
        existing.thumb = thumb;
        existing.avatar = profile?.avatar_url ?? null;
      }
    }
    list.push(...Array.from(dmMap.values()));

    // Groups
    const msgsByThread = new Map<string, GroupMsg[]>();
    for (const m of groupMsgs) {
      const arr = msgsByThread.get(m.thread_id) ?? [];
      arr.push(m);
      msgsByThread.set(m.thread_id, arr);
    }
    for (const [tid, mem] of Object.entries(myMemberships)) {
      const thread = groupThreads[tid];
      if (!thread) continue;
      const tMsgs = msgsByThread.get(tid) ?? [];
      const last = tMsgs[tMsgs.length - 1];
      const activeMembers = groupMembers.filter((m) => m.thread_id === tid && m.status === "active");
      const memberCount = activeMembers.length;
      const lastReadAt = mem.last_read_at ? new Date(mem.last_read_at).getTime() : 0;
      const unread = tMsgs.filter(
        (m) => m.sender_id !== user.id && new Date(m.created_at).getTime() > lastReadAt,
      ).length;
      const lastAt = last?.created_at ?? thread.updated_at;
      const lastSender = last ? profilesById[last.sender_id] : null;
      const lastSenderName = last?.sender_id === user.id ? "You" : lastSender?.business_name ?? lastSender?.full_name ?? "";
      const preview = last
        ? `${lastSenderName ? lastSenderName + ": " : ""}${attachmentPreview(last.body, last.attachment_type)}`
        : mem.status === "invited"
          ? "You've been invited"
          : "Group created";
      list.push({
        key: `group:${tid}`,
        kind: "group",
        listing_id: null,
        thread_id: tid,
        other_user_id: null,
        title: thread.title,
        subtitle: `${memberCount} member${memberCount === 1 ? "" : "s"}`,
        thumb: null,
        avatar: null,
        last_body: preview,
        last_at: lastAt,
        unread: mem.status === "invited" ? Math.max(unread, 1) : unread,
        invited: mem.status === "invited",
      });
    }

    return list.sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
  }, [dms, groupMsgs, groupThreads, groupMembers, myMemberships, listingsById, profilesById, user]);

  useEffect(() => {
    if (!activeKey && conversations.length) setActiveKey(conversations[0].key);
  }, [conversations, activeKey]);

  const activeConvo = conversations.find((c) => c.key === activeKey);

  const dmThread = useMemo(() => {
    if (!activeConvo || activeConvo.kind !== "dm" || !user) return [];
    return dms.filter(
      (m) =>
        m.listing_id === activeConvo.listing_id &&
        (m.sender_id === activeConvo.other_user_id ||
          m.recipient_id === activeConvo.other_user_id) &&
        (m.sender_id === user.id || m.recipient_id === user.id),
    );
  }, [dms, activeConvo, user]);

  const groupThread = useMemo(() => {
    if (!activeConvo || activeConvo.kind !== "group") return [];
    return groupMsgs
      .filter((m) => m.thread_id === activeConvo.thread_id)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }, [groupMsgs, activeConvo]);

  const activeMembers = useMemo(() => {
    if (!activeConvo || activeConvo.kind !== "group") return [];
    return groupMembers.filter((m) => m.thread_id === activeConvo.thread_id);
  }, [groupMembers, activeConvo]);

  // Mark DMs read
  useEffect(() => {
    if (!user || !activeConvo || activeConvo.kind !== "dm") return;
    const unreadIds = dmThread
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        setDms((prev) =>
          prev.map((m) =>
            unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m,
          ),
        );
      });
  }, [dmThread, user, activeConvo]);

  // Mark group thread read
  useEffect(() => {
    if (!user || !activeConvo || activeConvo.kind !== "group" || activeConvo.invited) return;
    const tid = activeConvo.thread_id!;
    (supabase.rpc as any)("mark_thread_read", { p_thread_id: tid }).then(() => {
      setMyMemberships((prev) => ({
        ...prev,
        [tid]: { ...(prev[tid] || { thread_id: tid, status: "active", last_read_at: null }), last_read_at: new Date().toISOString() },
      }));
    });
  }, [activeConvo, groupThread.length, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [dmThread.length, groupThread.length, activeKey]);

  const markDmUnread = async (c: ConversationSummary) => {
    const { error } = await supabase.rpc("mark_conversation_unread", {
      p_listing_id: c.listing_id!,
      p_other_user_id: c.other_user_id!,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as unread");
      load();
    }
  };

  const markDmRead = async (c: ConversationSummary) => {
    if (!user) return;
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("listing_id", c.listing_id!)
      .eq("recipient_id", user.id)
      .eq("sender_id", c.other_user_id!)
      .is("read_at", null);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as read");
      load();
    }
  };

  const acceptInvite = async (threadId: string) => {
    const { error } = await (supabase.rpc as any)("respond_to_thread_invite", {
      p_thread_id: threadId,
      p_accept: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Joined group");
      load();
    }
  };

  const declineInvite = async (threadId: string) => {
    const { error } = await (supabase.rpc as any)("respond_to_thread_invite", {
      p_thread_id: threadId,
      p_accept: false,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Invite declined");
      setActiveKey(null);
      load();
    }
  };

  const leaveGroup = async (threadId: string) => {
    if (!confirm("Leave this group chat?")) return;
    const { error } = await (supabase.rpc as any)("leave_thread", { p_thread_id: threadId });
    if (error) toast.error(error.message);
    else {
      toast.success("Left group");
      setActiveKey(null);
      load();
    }
  };

  const sendReply = async (payload: MessagePayload) => {
    if (!user || !activeConvo) return;
    if (!payload.body.trim() && !payload.attachment) return;
    setSending(true);
    let error;
    if (activeConvo.kind === "dm") {
      ({ error } = await supabase.from("messages").insert({
        listing_id: activeConvo.listing_id!,
        sender_id: user.id,
        recipient_id: activeConvo.other_user_id!,
        body: payload.body.trim() || null,
        attachment_url: payload.attachment?.url ?? null,
        attachment_type: payload.attachment?.type ?? null,
        attachment_thumb_url: payload.attachment?.thumbUrl ?? null,
        attachment_path: payload.attachment?.path ?? null,
        attachment_meta: (payload.attachment?.meta ?? null) as any,
      }));
    } else {
      ({ error } = await (supabase.from("chat_thread_messages" as any) as any).insert({
        thread_id: activeConvo.thread_id!,
        sender_id: user.id,
        body: payload.body.trim() || null,
        attachment_url: payload.attachment?.url ?? null,
        attachment_type: payload.attachment?.type ?? null,
        attachment_thumb_url: payload.attachment?.thumbUrl ?? null,
        attachment_path: payload.attachment?.path ?? null,
        attachment_meta: payload.attachment?.meta ?? null,
      }));
    }
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

  const GroupAvatar = ({ name, size = 44 }: { name: string; size?: number }) => (
    <div
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground"
    >
      <Users className="h-5 w-5" />
      <span className="sr-only">{name}</span>
    </div>
  );

  const memberProfileNames = (): string => {
    if (!activeConvo || activeConvo.kind !== "group") return "";
    const activeIds = activeMembers.filter((m) => m.status === "active").map((m) => m.user_id);
    const names = activeIds.slice(0, 4).map((id) => {
      if (id === user?.id) return "You";
      const p = profilesById[id];
      return p?.business_name ?? p?.full_name ?? "Member";
    });
    const extra = activeIds.length - names.length;
    return names.join(", ") + (extra > 0 ? ` +${extra}` : "");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        {user && (
          <Button size="sm" onClick={() => setShowNewGroup(true)}>
            <Plus className="mr-1 h-4 w-4" /> New group
          </Button>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-8 w-8" />
          No conversations yet. Start a group chat or message a seller from a listing.
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
                      {c.kind === "group" ? (
                        <GroupAvatar name={c.title} size={44} />
                      ) : (
                        <>
                          <Avatar url={c.avatar} name={c.title} size={44} />
                          {c.thumb && (
                            <img
                              src={c.thumb}
                              alt=""
                              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md border-2 border-card object-cover"
                            />
                          )}
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`truncate text-sm ${c.unread > 0 ? "font-bold" : "font-medium"}`}
                        >
                          {c.title}
                          {c.invited && (
                            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              INVITE
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDate(c.last_at)}
                        </div>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{c.subtitle}</div>
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
                      {c.kind === "dm" ? (
                        <>
                          {c.unread > 0 ? (
                            <DropdownMenuItem onClick={() => markDmRead(c)}>
                              <CheckCheck className="mr-2 h-4 w-4" /> Mark as read
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => markDmUnread(c)}>
                              <MailOpen className="mr-2 h-4 w-4" /> Mark as unread
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link to="/listing/$id" params={{ id: c.listing_id! }}>
                              <ExternalLink className="mr-2 h-4 w-4" /> Open listing
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {!c.invited && (
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveKey(c.key);
                                setShowInvite(true);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" /> Invite people
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => leaveGroup(c.thread_id!)}>
                            <LogOut className="mr-2 h-4 w-4" /> Leave group
                          </DropdownMenuItem>
                        </>
                      )}
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
                  {activeConvo.kind === "group" ? (
                    <GroupAvatar name={activeConvo.title} size={40} />
                  ) : (
                    <Avatar url={activeConvo.avatar} name={activeConvo.title} size={40} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{activeConvo.title}</div>
                    {activeConvo.kind === "dm" ? (
                      <Link
                        to="/listing/$id"
                        params={{ id: activeConvo.listing_id! }}
                        className="flex items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-primary"
                      >
                        {activeConvo.thumb && (
                          <img
                            src={activeConvo.thumb}
                            alt=""
                            className="h-4 w-4 rounded object-cover"
                          />
                        )}
                        <span className="truncate">{activeConvo.subtitle}</span>
                      </Link>
                    ) : (
                      <div className="truncate text-xs text-muted-foreground">
                        {memberProfileNames()}
                      </div>
                    )}
                  </div>
                  {activeConvo.kind === "group" && !activeConvo.invited && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInvite(true)}
                      className="shrink-0"
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Invite
                    </Button>
                  )}
                </div>

                {activeConvo.kind === "group" && activeConvo.invited ? (
                  <div className="flex-1 p-6 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-primary" />
                    <p className="mb-4 text-sm text-muted-foreground">
                      You've been invited to <strong>{activeConvo.title}</strong>. Join to view
                      messages and participate.
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button onClick={() => acceptInvite(activeConvo.thread_id!)}>Join group</Button>
                      <Button
                        variant="outline"
                        onClick={() => declineInvite(activeConvo.thread_id!)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      ref={scrollRef}
                      className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[55dvh]"
                    >
                      {activeConvo.kind === "dm"
                        ? dmThread.map((m) => {
                            const mine = m.sender_id === user?.id;
                            const hasAttachment = !!m.attachment_type;
                            return (
                              <div
                                key={m.id}
                                className={`flex ${mine ? "justify-end" : "justify-start"}`}
                              >
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
                                      meta={
                                        (m.attachment_meta as {
                                          width?: number;
                                          height?: number;
                                        } | null) ?? null
                                      }
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
                          })
                        : groupThread.map((m) => {
                            const mine = m.sender_id === user?.id;
                            const hasAttachment = !!m.attachment_type;
                            const sp = profilesById[m.sender_id];
                            const senderName =
                              sp?.business_name ?? sp?.full_name ?? "Member";
                            return (
                              <div
                                key={m.id}
                                className={`flex ${mine ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                    mine
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary text-secondary-foreground"
                                  }`}
                                >
                                  {!mine && (
                                    <div className="mb-0.5 text-[10px] font-semibold opacity-70">
                                      {senderName}
                                    </div>
                                  )}
                                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                                  {hasAttachment && (
                                    <AttachmentBubble
                                      type={m.attachment_type as "image" | "video" | "gif"}
                                      url={m.attachment_url}
                                      path={m.attachment_path}
                                      meta={
                                        (m.attachment_meta as {
                                          width?: number;
                                          height?: number;
                                        } | null) ?? null
                                      }
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
                      {activeConvo.kind === "group" && groupThread.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground">
                          No messages yet. Say hi!
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border p-3">
                      <MessageComposer
                        onSend={sendReply}
                        sending={sending}
                        placeholder={
                          activeConvo.kind === "group" ? "Message the group…" : "Write a reply…"
                        }
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="hidden p-12 text-center text-muted-foreground lg:block">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}

      {user && (
        <NewGroupChatDialog
          open={showNewGroup}
          onOpenChange={setShowNewGroup}
          currentUserId={user.id}
          onCreated={(tid) => {
            setActiveKey(`group:${tid}`);
            load();
          }}
        />
      )}
      {activeConvo?.kind === "group" && activeConvo.thread_id && (
        <InviteToThreadDialog
          open={showInvite}
          onOpenChange={setShowInvite}
          threadId={activeConvo.thread_id}
          threadTitle={activeConvo.title}
          excludeIds={activeMembers.map((m) => m.user_id)}
          onInvited={load}
        />
      )}
    </div>
  );
}
