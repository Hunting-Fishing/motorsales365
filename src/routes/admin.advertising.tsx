import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Mail, Building2, Phone, Calendar, Banknote, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/advertising")({
  component: AdminAdvertising,
});

const STATUSES = ["new", "in_review", "quoted", "won", "lost", "spam"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_TONE: Record<Status, string> = {
  new: "bg-primary text-primary-foreground",
  in_review: "bg-blue-500 text-white",
  quoted: "bg-amber-500 text-white",
  won: "bg-emerald-500 text-white",
  lost: "bg-muted text-muted-foreground",
  spam: "bg-destructive text-destructive-foreground",
};

function AdminAdvertising() {
  const { user, isAdmin, isAdvertising } = useAuth();
  const hasAccess = isAdmin || isAdvertising;
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    let q = supabase.from("ad_inquiries").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    setInquiries(data ?? []);
  };

  const loadThread = async (id: string) => {
    setActiveId(id);
    const { data } = await supabase.from("ad_inquiry_messages").select("*").eq("inquiry_id", id).order("created_at");
    setMessages(data ?? []);
    const cur = (inquiries.find((i) => i.id === id) ?? {}) as any;
    setNotes(cur.internal_notes ?? "");
  };

  useEffect(() => { if (hasAccess) load(); /* eslint-disable-next-line */ }, [filter, hasAccess]);

  const active = useMemo(() => inquiries.find((i) => i.id === activeId), [inquiries, activeId]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("ad_inquiries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const saveNotes = async () => {
    if (!active) return;
    const { error } = await supabase.from("ad_inquiries").update({ internal_notes: notes }).eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    load();
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    const { error } = await supabase.from("ad_inquiry_messages").insert({
      inquiry_id: active.id,
      sender_id: user?.id ?? null,
      sender_name: user?.user_metadata?.full_name ?? user?.email ?? "Staff",
      sender_email: user?.email ?? null,
      body: reply.trim(),
      from_staff: true,
    });
    if (error) return toast.error(error.message);
    setReply("");
    loadThread(active.id);
    if (active.status === "new") setStatus(active.id, "in_review");
  };

  if (!hasAccess) return <div className="p-8 text-center text-muted-foreground">No access.</div>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Megaphone className="h-6 w-6" /> Advertising inquiries
        </h1>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {inquiries.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No inquiries.
            </div>
          )}
          {inquiries.map((i) => (
            <button
              key={i.id}
              onClick={() => loadThread(i.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                activeId === i.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{i.contact_name}</span>
                <Badge className={STATUS_TONE[i.status as Status]}>{i.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{i.company || i.email}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.message}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(i.created_at)} · {i.placement}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {!active ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
              Select an inquiry to view details.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{active.contact_name}</h2>
                  <div className="text-sm text-muted-foreground">
                    {active.company && <>{active.company} · </>}submitted {formatDate(active.created_at)}
                  </div>
                </div>
                <Select value={active.status} onValueChange={(v) => setStatus(active.id, v as Status)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Info icon={<Mail className="h-4 w-4" />} label="Email" value={<a className="text-primary underline" href={`mailto:${active.email}`}>{active.email}</a>} />
                {active.phone && <Info icon={<Phone className="h-4 w-4" />} label="Phone" value={active.phone} />}
                <Info icon={<Building2 className="h-4 w-4" />} label="Placement" value={active.placement} />
                {active.budget_range && <Info icon={<Banknote className="h-4 w-4" />} label="Budget" value={active.budget_range} />}
                {active.start_date && <Info icon={<Calendar className="h-4 w-4" />} label="Start date" value={active.start_date} />}
                {active.source_url && <Info icon={<ExternalLink className="h-4 w-4" />} label="Source" value={<a className="truncate text-primary underline" href={active.source_url} target="_blank" rel="noreferrer">{active.source_url}</a>} />}
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original message</h3>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-3 text-sm">{active.message}</p>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversation</h3>
                <div className="space-y-2 rounded-lg border border-border bg-background p-3 max-h-72 overflow-y-auto">
                  {messages.length === 0 && <p className="text-xs text-muted-foreground">No replies yet.</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={`rounded-md p-2 text-sm ${m.from_staff ? "bg-primary/10" : "bg-secondary"}`}>
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        {m.from_staff ? "Staff" : "Advertiser"} · {m.sender_name ?? "?"} · {formatDate(m.created_at)}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="mt-2"
                />
                <Button onClick={sendReply} disabled={!reply.trim()} className="mt-2">Send reply</Button>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal notes</h3>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible only to staff" />
                <Button size="sm" variant="outline" className="mt-2" onClick={saveNotes}>Save notes</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/30 p-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
