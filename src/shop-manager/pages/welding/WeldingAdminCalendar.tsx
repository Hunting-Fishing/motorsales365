import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];
const emptyEntry = { title: "", entry_type: "shop_day", notes: "", color: COLORS[0], entry_date: "", customer_id: null, quote_id: null };

const WeldingAdminCalendar = () => {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyEntry });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["welding-calendar", shopId, year, month],
    queryFn: async () => {
      if (!shopId) return [] as any[];
      const { data, error } = await supabase.from("welding_schedule_entries" as any).select("*").eq("shop_id", shopId).gte("entry_date", firstDay.toISOString().split("T")[0]).lte("entry_date", lastDay.toISOString().split("T")[0]);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const payload = { shop_id: shopId, title: d.title, entry_type: d.entry_type, notes: d.notes || null, color: d.color || null, entry_date: d.entry_date, customer_id: d.customer_id || null, quote_id: d.quote_id || null };
      if (editing) { const { error } = await supabase.from("welding_schedule_entries" as any).update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("welding_schedule_entries" as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-calendar"] }); toast.success(editing ? "Updated" : "Added"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("welding_schedule_entries" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["welding-calendar"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const days = useMemo(() => {
    const result: { date: number; dateStr: string; entries: any[] }[] = [];
    const startPad = firstDay.getDay();
    for (let i = 0; i < startPad; i++) result.push({ date: 0, dateStr: "", entries: [] });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ date: d, dateStr, entries: entries.filter((e: any) => e.entry_date === dateStr) });
    }
    return result;
  }, [entries, year, month, firstDay, lastDay]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const openNew = (dateStr?: string) => { setEditing(null); setForm({ ...emptyEntry, entry_date: dateStr || new Date().toISOString().split("T")[0] }); setOpen(true); };
  const openEdit = (entry: any) => { setEditing(entry); setForm({ ...emptyEntry, ...entry }); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <WeldingAdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Calendar</h1>
        <Button onClick={() => openNew()} size="sm"><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
      </div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="font-semibold text-lg">{monthName}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
      </div>
      {isLoading ? <p className="text-muted-foreground text-center py-12">Loading...</p> : (
        <>
          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((day, i) => (
              <div key={i} className={`min-h-[80px] md:min-h-[100px] p-1 bg-card ${day.date === 0 ? "bg-muted/30" : "cursor-pointer hover:bg-accent/20"}`} onClick={() => day.date > 0 && openNew(day.dateStr)}>
                {day.date > 0 && (
                  <>
                    <span className={`text-xs font-medium ${day.dateStr === new Date().toISOString().split("T")[0] ? "bg-primary text-primary-foreground rounded-full px-1.5 py-0.5" : ""}`}>{day.date}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {day.entries.slice(0, 3).map((e: any) => (
                        <div key={e.id} className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer" style={{ backgroundColor: e.color || "#3b82f6", color: "#fff" }} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>{e.title}</div>
                      ))}
                      {day.entries.length > 3 && <span className="text-[10px] text-muted-foreground">+{day.entries.length - 3} more</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Entry" : "New Entry"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
              <div><Label>Type</Label><Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shop_day">Shop Day</SelectItem><SelectItem value="job">Job</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="deadline">Deadline</SelectItem><SelectItem value="reminder">Reminder</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Color</Label><div className="flex gap-2 mt-1">{COLORS.map((c) => <button key={c} type="button" className={`w-7 h-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />)}</div></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

export default WeldingAdminCalendar;
