import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, CheckCheck, Check, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageComposer, type MessagePayload } from "@/components/messaging/message-composer";
import { AttachmentBubble } from "@/components/messaging/attachment-bubble";

type AttachType = "image" | "video" | "gif" | null;

interface ChatMsg {
  id: string;
  body: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: AttachType;
  attachment_thumb_url: string | null;
  attachment_path: string | null;
  attachment_meta: Record<string, unknown> | null;
}

interface Props {
  listingId: string;
  sellerId: string;
  sellerName?: string | null;
  sellerAvatarUrl?: string | null;
  listingTitle?: string | null;
  /** Backwards-compat props (unused – composer owns state). */
  message?: string;
  setMessage?: (v: string) => void;
  onSend?: (payload?: MessagePayload) => Promise<void> | void;
  sending?: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (sameDay(iso, today.toISOString())) return "Today";
  if (sameDay(iso, yest.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Messenger-style floating chat widget on the listing detail page.
 * Owns the DM transcript for (listing, buyer↔seller), realtime, read-tracking,
 * and unread pill on the launcher when closed.
 */
export function FloatingMessageWidget({
  listingId,
  sellerId,
  sellerName,
  sellerAvatarUrl,
  listingTitle,
  open,
  setOpen,
}: Props) {
  const { user } = useAuth();
  const buyerId = user?.id ?? null;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadWhileClosed, setUnreadWhileClosed] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canChat = !!buyerId && buyerId !== sellerId;

  // Escape closes the widget
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Load transcript for this listing between me & seller
  const loadThread = useCallback(async () => {
    if (!canChat || !buyerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,body,created_at,sender_id,recipient_id,read_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
      )
      .eq("listing_id", listingId)
      .or(
        `and(sender_id.eq.${buyerId},recipient_id.eq.${sellerId}),and(sender_id.eq.${sellerId},recipient_id.eq.${buyerId})`,
      )
      .order("created_at", { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) {
      console.warn("[widget] load thread", error.message);
      return;
    }
    setMessages((data as ChatMsg[]) ?? []);
  }, [buyerId, sellerId, listingId, canChat]);

  useEffect(() => {
    if (canChat) loadThread();
  }, [canChat, loadThread]);

  // Realtime updates for messages in this pair
  useEffect(() => {
    if (!canChat || !buyerId) return;
    const ch = supabase
      .channel(`widget-${listingId}-${buyerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `listing_id=eq.${listingId}` },
        (payload) => {
          const row = payload.new as ChatMsg;
          // Only messages between me and this seller
          const involvesUs =
            (row.sender_id === buyerId && row.recipient_id === sellerId) ||
            (row.sender_id === sellerId && row.recipient_id === buyerId);
          if (!involvesUs) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (row.sender_id === sellerId) {
            if (!open) {
              setUnreadWhileClosed((n) => n + 1);
              toast(sellerName ? `${sellerName} replied` : "New message", {
                description: row.body ?? "New attachment",
                action: {
                  label: "Open",
                  onClick: () => setOpen(true),
                },
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `listing_id=eq.${listingId}` },
        (payload) => {
          const row = payload.new as ChatMsg;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canChat, buyerId, sellerId, listingId, open, sellerName, setOpen]);

  // Auto-scroll to bottom on open + on new messages
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [open, messages.length]);

  // Clear unread pill + mark inbound read when opening
  useEffect(() => {
    if (!open) return;
    setUnreadWhileClosed(0);
    if (!canChat || !buyerId) return;
    const unreadIds = messages
      .filter((m) => m.sender_id === sellerId && m.recipient_id === buyerId && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("messages")
        .update({ read_at: nowIso })
        .in("id", unreadIds)
        .eq("recipient_id", buyerId);
      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: nowIso } : m)),
        );
        // Sync the in-app notifications bell
        try {
          await supabase.rpc("mark_message_notifications_read" as any, {
            _listing_id: listingId,
            _other_user_id: sellerId,
          });
        } catch {
          /* helper is optional; ignore */
        }
      }
    })();
  }, [open, messages, canChat, buyerId, sellerId, listingId]);

  const send = async (payload?: MessagePayload) => {
    if (!user || !buyerId) return;
    const body = (payload?.body ?? "").trim();
    const attachment = payload?.attachment;
    if (!body && !attachment) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        listing_id: listingId,
        sender_id: buyerId,
        recipient_id: sellerId,
        body: body || null,
        attachment_url: attachment?.url ?? null,
        attachment_type: attachment?.type ?? null,
        attachment_thumb_url: attachment?.thumbUrl ?? null,
        attachment_path: attachment?.path ?? null,
        attachment_meta: (attachment?.meta ?? null) as any,
      })
      .select(
        "id,body,created_at,sender_id,recipient_id,read_at,attachment_url,attachment_type,attachment_thumb_url,attachment_path,attachment_meta",
      )
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as ChatMsg]));
    }
  };

  const initial = (sellerName || "S").trim().charAt(0).toUpperCase();

  // Grouped rendering with day dividers
  const rendered = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let lastDay: string | null = null;
    let lastSender: string | null = null;
    let lastAt: string | null = null;
    messages.forEach((m, idx) => {
      if (!lastDay || !sameDay(lastDay, m.created_at)) {
        nodes.push(
          <div
            key={`day-${m.id}`}
            className="my-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            <span className="h-px flex-1 bg-border" />
            <span>{formatDay(m.created_at)}</span>
            <span className="h-px flex-1 bg-border" />
          </div>,
        );
        lastDay = m.created_at;
        lastSender = null;
      }
      const mine = m.sender_id === buyerId;
      const groupedWithPrev =
        lastSender === m.sender_id &&
        lastAt &&
        new Date(m.created_at).getTime() - new Date(lastAt).getTime() < 5 * 60 * 1000;
      const isLastFromMe =
        mine && idx === messages.length - 1;
      const readByOther = mine && !!m.read_at;
      nodes.push(
        <div
          key={m.id}
          className={cn(
            "flex w-full flex-col",
            mine ? "items-end" : "items-start",
            groupedWithPrev ? "mt-0.5" : "mt-2",
          )}
        >
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-1.5 text-xs shadow-sm",
              mine
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-foreground rounded-bl-sm border border-border",
            )}
          >
            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
            {m.attachment_url && m.attachment_type && (
              <AttachmentBubble
                type={m.attachment_type}
                url={m.attachment_url}
                path={m.attachment_path}
                meta={m.attachment_meta as any}
              />
            )}
          </div>
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
              mine ? "flex-row-reverse" : "",
            )}
          >
            <span>{formatTime(m.created_at)}</span>
            {isLastFromMe && (
              <span
                title={readByOther ? "Seen" : "Sent"}
                className={readByOther ? "text-primary" : ""}
              >
                {readByOther ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>,
      );
      lastSender = m.sender_id;
      lastAt = m.created_at;
    });
    return nodes;
  }, [messages, buyerId]);

  const totalCount = messages.length;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close message widget" : "Message the seller"}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed right-4 z-[60] grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6",
          open && "rotate-90",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && unreadWhileClosed > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadWhileClosed}
          </span>
        )}
        {!open && unreadWhileClosed === 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Send a message"
          className={cn(
            "fixed right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
            "bottom-[calc(9rem+env(safe-area-inset-bottom))] lg:bottom-24",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
          )}
          style={{ maxHeight: "min(70vh, 560px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary/95 px-4 py-3 text-primary-foreground">
            {sellerAvatarUrl ? (
              <img
                src={sellerAvatarUrl}
                alt={sellerName ?? "Seller"}
                className="h-9 w-9 rounded-full border-2 border-primary-foreground/40 object-cover"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/20 text-sm font-semibold">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{sellerName || "Seller"}</p>
              <p className="truncate text-[11px] opacity-80">
                {totalCount > 0
                  ? `${totalCount} message${totalCount === 1 ? "" : "s"} • Usually replies within a few hours`
                  : "Usually replies within a few hours"}
              </p>
            </div>
            <Link
              to="/dashboard/messages"
              className="rounded-full p-1 text-primary-foreground/90 hover:bg-primary-foreground/15"
              title="Open full inbox"
              aria-label="Open full inbox"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-primary-foreground/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-0 overflow-y-auto bg-secondary/30 px-3 py-3"
          >
            {!canChat && (
              <div className="rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                {buyerId ? "You can't message yourself on your own listing." : "Sign in to send a message."}
              </div>
            )}
            {canChat && loading && messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground">Loading conversation…</div>
            )}
            {canChat && !loading && messages.length === 0 && (
              <div className="mx-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-xs text-foreground shadow-sm">
                👋 Hi! Ask about
                {listingTitle ? (
                  <>
                    {" "}
                    <span className="font-semibold">{listingTitle}</span>
                  </>
                ) : (
                  " this listing"
                )}
                . Keep transactions safe — meet in person.
              </div>
            )}
            {canChat && rendered}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card p-3">
            <MessageComposer
              onSend={(payload) => send(payload)}
              sending={sending}
              placeholder={canChat ? "Type your message…" : "Sign in to send"}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
}
