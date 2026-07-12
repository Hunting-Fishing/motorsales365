import { useEffect, useState } from "react";
import { Plus, Zap, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface QuickReply {
  id: string;
  title: string;
  body: string;
  sort_order: number;
}

const DEFAULTS: { title: string; body: string }[] = [
  { title: "Still available?", body: "Hi! Is this still available?" },
  { title: "Best price", body: "Hi, what's the best price you can do?" },
  { title: "Location", body: "Where can we meet? What area are you in?" },
  { title: "Available", body: "Yes, still available. Interested?" },
  { title: "Sold", body: "Thanks for reaching out, this one is sold." },
];

interface Props {
  onPick: (body: string) => void;
}

export function QuickRepliesButton({ onPick }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QuickReply[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("quick_replies" as any)
      .select("id,title,body,sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data ?? []) as unknown as QuickReply[]);
  };

  useEffect(() => {
    if (open || manageOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manageOpen, user?.id]);

  const list = items.length > 0 ? items : DEFAULTS.map((d, i) => ({ id: `d-${i}`, sort_order: i, ...d }));

  const saveOne = async () => {
    if (!user || !title.trim() || !body.trim()) {
      toast.error("Both fields are required");
      return;
    }
    if (editing && !editing.id.startsWith("d-")) {
      const { error } = await supabase
        .from("quick_replies" as any)
        .update({ title: title.trim(), body: body.trim() })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("quick_replies" as any)
        .insert({ user_id: user.id, title: title.trim(), body: body.trim(), sort_order: items.length });
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    setTitle("");
    setBody("");
    await load();
  };

  const removeOne = async (id: string) => {
    if (id.startsWith("d-")) return;
    const { error } = await supabase.from("quick_replies" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Quick replies"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Zap className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground">Quick replies</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setManageOpen(true);
              }}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {list.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  onPick(q.body);
                  setOpen(false);
                }}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
              >
                <div className="font-medium">{q.title}</div>
                <div className="line-clamp-1 text-[11px] text-muted-foreground">{q.body}</div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage quick replies</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border">
              {list.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{q.body}</div>
                  </div>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => {
                      setEditing(q);
                      setTitle(q.title);
                      setBody(q.body);
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {!q.id.startsWith("d-") && (
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => removeOne(q.id)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="text-xs font-semibold">
                {editing ? `Editing "${editing.title}"` : "Add a new quick reply"}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title (e.g. Still available)"
                maxLength={60}
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="The message text…"
                rows={3}
                maxLength={500}
              />
              <div className="flex justify-end gap-1">
                {editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setTitle("");
                      setBody("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button size="sm" onClick={saveOne}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> {editing ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
