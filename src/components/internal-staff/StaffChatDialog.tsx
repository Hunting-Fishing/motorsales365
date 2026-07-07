import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Check, CheckCheck, Paperclip, X, FileIcon, Loader2, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getStaffDmAttachmentUrl } from "@/lib/staff-dm-attachments.functions";
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

const BUCKET = "staff-dm-attachments";
const MAX_MB = 20;

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};

const SELECT_COLS =
  "id,sender_id,recipient_id,body,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size";

function formatBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const re = new RegExp(`(${escapeRegExp(query)})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-yellow-300/70 px-0.5 text-foreground">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );

function AttachmentPreview({ msg }: { msg: Msg }) {
  const sign = useServerFn(getStaffDmAttachmentUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = (msg.attachment_type ?? "").startsWith("image/");

  useEffect(() => {
    if (!isImage || !msg.attachment_path) return;
    let cancelled = false;
    setLoading(true);
    sign({ data: { messageId: msg.id } })
      .then((r) => {
        if (!cancelled) setUrl(r.url);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isImage, msg.attachment_path, msg.id, sign]);

  const openDownload = async () => {
    try {
      const r = await sign({ data: { messageId: msg.id } });
      window.open(r.url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open file");
    }
  };

  if (isImage) {
    return (
      <button
        type="button"
        onClick={openDownload}
        className="mt-1 block overflow-hidden rounded-md border border-border bg-background"
      >
        {url ? (
          <img
            src={url}
            alt={msg.attachment_name ?? "attachment"}
            className="max-h-56 max-w-full object-contain"
          />
        ) : (
          <div className="flex h-32 w-40 items-center justify-center text-muted-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Image"}
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openDownload}
      className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5 text-left text-xs hover:bg-background"
    >
      <FileIcon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{msg.attachment_name ?? "file"}</span>
      <span className="shrink-0 text-muted-foreground">
        {formatBytes(msg.attachment_size)}
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </button>
  );
}

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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const q = query.trim().toLowerCase();
  const visibleMessages = useMemo(() => {
    if (!q) return messages;
    return messages.filter((m) => {
      const inBody = (m.body ?? "").toLowerCase().includes(q);
      const inName = (m.attachment_name ?? "").toLowerCase().includes(q);
      return inBody || inName;
    });
  }, [messages, q]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const fetchThread = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff_dms")
        .select(SELECT_COLS)
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
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: m.read_at ?? now } : m)),
    );
  }, [open, user, messages]);

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

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large. Max ${MAX_MB} MB.`);
      return;
    }
    setPendingFile(f);
  };

  const send = async () => {
    if (!user) return;
    const body = text.trim();
    if (!body && !pendingFile) return;
    setSending(true);

    let attachment: {
      attachment_path: string;
      attachment_name: string;
      attachment_type: string;
      attachment_size: number;
    } | null = null;

    if (pendingFile) {
      setUploading(true);
      const safeName = pendingFile.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, pendingFile, {
          contentType: pendingFile.type || "application/octet-stream",
          upsert: false,
        });
      setUploading(false);
      if (upErr) {
        setSending(false);
        toast.error(upErr.message);
        return;
      }
      attachment = {
        attachment_path: path,
        attachment_name: pendingFile.name,
        attachment_type: pendingFile.type || "application/octet-stream",
        attachment_size: pendingFile.size,
      };
    }

    const { data, error } = await supabase
      .from("staff_dms")
      .insert({
        sender_id: user.id,
        recipient_id: otherUserId,
        body: body || null,
        ...(attachment ?? {}),
      })
      .select(SELECT_COLS)
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      // Clean up orphaned upload
      if (attachment) {
        await supabase.storage.from(BUCKET).remove([attachment.attachment_path]);
      }
      return;
    }
    setText("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!loading && messages.length === 0 && (
            <div className="text-xs text-muted-foreground">No messages yet — say hi.</div>
          )}
          {messages.map((m, i) => {
            const mine = m.sender_id === user?.id;
            const showReadReceipt = mine && i === lastReadMineIdx;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {m.body && (
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  )}
                  {m.attachment_path && <AttachmentPreview msg={m} />}
                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                    {mine && (
                      <span
                        className="ml-auto inline-flex items-center gap-0.5"
                        title={
                          m.read_at
                            ? `Read ${new Date(m.read_at).toLocaleString()}`
                            : "Sent"
                        }
                        aria-label={m.read_at ? "Read" : "Sent"}
                      >
                        {m.read_at ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        {showReadReceipt && m.read_at && (
                          <span className="ml-1">
                            Read{" "}
                            {new Date(m.read_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {pendingFile && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
            <FileIcon className="h-3.5 w-3.5" />
            <span className="min-w-0 flex-1 truncate">{pendingFile.name}</span>
            <span className="text-muted-foreground">{formatBytes(pendingFile.size)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
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
          <Button
            onClick={send}
            disabled={sending || uploading || (!text.trim() && !pendingFile)}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
