import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";
import WeldingAdminLayout from "@/components/welding/WeldingAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const emptyLink = { title: "", url: "", description: "", icon: "", sort_order: 0 };

const WeldingAdminLinks = () => {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyLink });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["welding-links", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_quick_links" as any).select("*").eq("shop_id", shopId).order("sort_order");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, title: d.title, url: d.url, description: d.description || null, icon: d.icon || null, sort_order: Number(d.sort_order) };
      if (editing) { const { error } = await supabase.from("welding_quick_links" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_quick_links" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-links"] }); toast.success(editing ? "Updated" : "Added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_quick_links" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-links"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (l: any) => { setEditing(l); setForm({ ...emptyLink, ...l }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...emptyLink, sort_order: links.length }); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); };

  return (
    <WeldingAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">External Links</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Add Link</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : links.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No links yet</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">{links.map((l: any) => (
          <Card key={l.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(l)}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold">{l.title}</p>{l.description && <p className="text-sm text-muted-foreground truncate">{l.description}</p>}<p className="text-xs text-primary truncate">{l.url}</p></div>
              <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0"><ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>
            </CardContent>
          </Card>
        ))}</div>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Link" : "Add Link"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>URL *</Label><Input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Icon</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. link" /></div>
              <div><Label>Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              {editing && <Button type="button" variant="destructive" size="sm" onClick={() => { deleteMutation.mutate(editing.id); closeDialog(); }}>Delete</Button>}
              <div className="ml-auto flex gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WeldingAdminLayout>
  );
};

export default WeldingAdminLinks;
