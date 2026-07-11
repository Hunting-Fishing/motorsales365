import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Inbox, Search, Trash2, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";

const WeldingAdminMessages = () => {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["welding-messages", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_contact_messages" as any).select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const toggleRead = useMutation({
    mutationFn: async (msg: any) => {
      await supabase.from("welding_contact_messages" as any).update({ is_read: !msg.is_read }).eq("id", msg.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["welding-messages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("welding_contact_messages" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-messages"] }); toast.success("Message deleted"); setSelected(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openMsg = (msg: any) => {
    setSelected(msg);
    if (!msg.is_read) toggleRead.mutate(msg);
  };

  const unreadCount = messages.filter((m: any) => !m.is_read).length;
  const filtered = messages.filter((m: any) => !search || (m.name || "").toLowerCase().includes(search.toLowerCase()) || (m.subject || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <WeldingAdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Messages</h1>
        {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
      </div>
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No messages</p></CardContent></Card>
      ) : (
        <div className="grid gap-2">{filtered.map((msg: any) => (
          <Card key={msg.id} className={`cursor-pointer hover:shadow-md transition-shadow ${!msg.is_read ? "border-primary/30 bg-primary/5" : ""}`} onClick={() => openMsg(msg)}>
            <CardContent className="p-4 flex items-start gap-3">
              {msg.is_read ? <MailOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /> : <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className={`font-medium text-sm ${!msg.is_read ? "font-bold" : ""}`}>{msg.name || "Anonymous"}</span><span className="text-xs text-muted-foreground shrink-0">{new Date(msg.created_at).toLocaleDateString()}</span></div>
                <p className="text-sm font-medium truncate">{msg.subject || "No subject"}</p>
                <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}</div>
      )}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.subject || "Message"}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm"><span className="font-medium">From:</span> {selected.name} {selected.email && `<${selected.email}>`}</div>
              {selected.phone && <div className="text-sm"><span className="font-medium">Phone:</span> {selected.phone}</div>}
              <div className="text-sm"><span className="font-medium">Date:</span> {new Date(selected.created_at).toLocaleString()}</div>
              <div className="border-t pt-3"><p className="text-sm whitespace-pre-wrap">{selected.message}</p></div>
              <div className="flex justify-between pt-2">
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selected.id)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                <Button variant="outline" size="sm" onClick={() => { toggleRead.mutate(selected); setSelected(null); }}>{selected.is_read ? "Mark Unread" : "Mark Read"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminMessages;
