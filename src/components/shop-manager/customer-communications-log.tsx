import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Phone, Mail, StickyNote, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smSupabase } from "@/lib/shop-manager/db";
import { toast } from "sonner";

type CommRow = {
  id: string;
  type: string | null;
  direction: string | null;
  subject: string | null;
  content: string | null;
  date: string | null;
  staff_member_name: string | null;
  status: string | null;
};

const TYPE_ICON: Record<string, any> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  note: StickyNote,
};

export function CustomerCommunicationsLog({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("call");
  const [direction, setDirection] = useState("outbound");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "customer_communications", customerId],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("customer_communications")
        .select("id,type,direction,subject,content,date,staff_member_name,status")
        .eq("customer_id", customerId)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CommRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (smSupabase as any).from("customer_communications").insert({
        customer_id: customerId,
        type,
        direction,
        subject: subject || null,
        content: content || null,
        date: new Date().toISOString(),
        status: "logged",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logged");
      setSubject("");
      setContent("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["shop-manager", "customer_communications", customerId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to log"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Communications ({rows.length})
        </CardTitle>
        <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> {open ? "Cancel" : "Log entry"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="rounded border p-3 space-y-2 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="What happened?" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
            <div className="flex justify-end">
              <Button size="sm" disabled={create.isPending || !content} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Save entry
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No communications logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const Icon = TYPE_ICON[r.type ?? "note"] ?? MessageSquare;
              return (
                <li key={r.id} className="flex gap-3 rounded border p-2 text-sm">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{r.type ?? "note"}</span>
                      {r.direction ? <Badge variant="outline" className="text-[10px]">{r.direction}</Badge> : null}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {r.date ? new Date(r.date).toLocaleString() : ""}
                      </span>
                    </div>
                    {r.subject ? <div className="font-medium mt-0.5">{r.subject}</div> : null}
                    {r.content ? <div className="text-muted-foreground whitespace-pre-wrap">{r.content}</div> : null}
                    {r.staff_member_name ? (
                      <div className="text-xs text-muted-foreground mt-1">by {r.staff_member_name}</div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
