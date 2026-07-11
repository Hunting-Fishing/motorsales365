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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Trash2, Image, Star } from "lucide-react";
import { toast } from "sonner";

const emptyProject = { title: "", description: "", category: "", image_url: "", is_featured: false, tags: [] as string[], display_order: 0 };

const WeldingAdminGallery = () => {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyProject });
  const [tagInput, setTagInput] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["welding-gallery", shopId],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_gallery_projects" as any).select("*").eq("shop_id", shopId).order("display_order");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, title: d.title, description: d.description || null, category: d.category || null, image_url: d.image_url || null, is_featured: d.is_featured, tags: d.tags || [], display_order: Number(d.display_order) };
      if (editing) { const { error } = await supabase.from("welding_gallery_projects" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_gallery_projects" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-gallery"] }); toast.success(editing ? "Updated" : "Added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_gallery_projects" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-gallery"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => { setEditing(p); setForm({ ...emptyProject, ...p, tags: p.tags || [] }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm({ ...emptyProject, display_order: projects.length }); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); setTagInput(""); };
  const addTag = () => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { setForm({ ...form, tags: [...form.tags, tagInput.trim()] }); setTagInput(""); } };
  const removeTag = (t: string) => setForm({ ...form, tags: form.tags.filter((tag: string) => tag !== t) });

  const filtered = projects.filter((p: any) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <WeldingAdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Gallery</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Add Project</Button>
      </div>
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search gallery..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Image className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No gallery projects</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={() => openEdit(p)}>
              {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-muted flex items-center justify-center"><Image className="h-12 w-12 text-muted-foreground/30" /></div>}
              <CardContent className="p-3">
                <div className="flex items-center gap-2"><span className="font-semibold text-sm">{p.title}</span>{p.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}</div>
                {p.category && <Badge variant="outline" className="text-xs mt-1">{p.category}</Badge>}
                {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                {p.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Featured</Label></div>
            <div><Label>Tags</Label><div className="flex gap-2 mt-1"><Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} /><Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button></div>
              {form.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{form.tags.map((t: string) => <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ×</Badge>)}</div>}
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

export default WeldingAdminGallery;
