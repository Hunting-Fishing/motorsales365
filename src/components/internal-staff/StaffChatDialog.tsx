import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export function StaffChatDialog({
  open,
  onOpenChange,
  otherUserId,
  otherName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  otherUserId: string;
  otherName: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const fetchThread = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_dms")
        .select("id,sender_id,recipient_id,body,created_at,read_at")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);
      if (!cancelled) {
        if (error) toast.error(error.message);
        setMessages((data as Msg[]) ?? []);
        setLoading(false);
      }
    };
    fetchThread();

    const channel = supabase
      .channel(`staff-dms-${user.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_dms" },
        (payload) => {
          const m = payload.new as Msg;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === user.id);
          if (inThread)
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "staff_dms" },
        (payload) => {
          const m = payload.new as Msg;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === user.id);
          if (!inThread) return;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, user, otherUserId]);

  // Mark incoming as read when opened
  useEffect(() => {
    if (!open || !user) return;
    const unread = messages.filter((m) => m.recipient_id === user.id && !m.read_at);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    const ids = unread.map((m) => m.id);
    supabase
      .from("staff_dms")
      .update({ read_at: now })
      .in("id", ids)
      .then(() => {});
    // Optimistically reflect locally
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: m.read_at ?? now } : m)),
    );
  }, [open, user, messages]);

  // Index of the newest message I sent that the other side has read.
  const lastReadMineIdx = useMemo(() => {
    if (!user) return -1;
    let idx = -1;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.sender_id === user.id && m.read_at) idx = i;
    }
    return idx;
  }, [messages, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { data, error } = await supabase
      .from("staff_dms")
      .insert({ sender_id: user.id, recipient_id: otherUserId, body })
      .select("id,sender_id,recipient_id,body,created_at,read_at")
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(body);
      return;
    }
    // Optimistically append (realtime may also echo; dedupe by id)
    if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === (data as Msg).id) ? prev : [...prev, data as Msg],
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat with {otherName}</DialogTitle>
          <DialogDescription>Internal 365 team message</DialogDescription>
        </DialogHeader>
        <div
          ref={scrollRef}
          className="h-80 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2"
        >
          {loading && (
            <div className="text-xs text-muted-foreground">Loading…</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No messages yet — say hi.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            rows={2}
            className="flex-1"
          />
          <Button onClick={send} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
