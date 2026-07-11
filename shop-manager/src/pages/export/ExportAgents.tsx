import React, { useState } from 'react';
import { useExportAgents } from '@/hooks/export/useExportAgents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Trash2, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  inactive: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
  suspended: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export default function ExportAgents() {
  const { agents, loading, create, update, remove } = useExportAgents();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const totalCommOwed = agents.reduce((sum, a) => sum + (Number(a.total_commission_earned) - Number(a.total_commission_paid)), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agents & Commissions</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agents · ${totalCommOwed.toFixed(2)} owed</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Agent</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Agent</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Agent Name</Label><Input value={form.agent_name || ''} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} /></div>
              <div><Label>Company</Label><Input value={form.company_name || ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Country</Label><Input value={form.country || ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
                <div><Label>Region</Label><Input value={form.region || ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} /></div>
              </div>
              <div><Label>Commission Rate (%)</Label><Input type="number" step="0.01" value={form.commission_rate || ''} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add Agent</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-40" />No agents yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {agents.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{a.agent_name}</span>
                      <Badge variant="outline" className={statusColors[a.status] || ''}>{a.status}</Badge>
                    </div>
                    {a.company_name && <p className="text-sm text-muted-foreground">{a.company_name}</p>}
                    <p className="text-xs text-muted-foreground">{a.country} {a.region ? `· ${a.region}` : ''}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{a.commission_rate}% rate</span>
                      <span>Earned: ${Number(a.total_commission_earned).toFixed(2)}</span>
                      <span>Paid: ${Number(a.total_commission_paid).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
