import React, { useState } from 'react';
import { useExportCertificates } from '@/hooks/export/useExportCertificates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileCheck, Trash2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  expired: 'bg-red-500/10 text-red-700 border-red-500/30',
  pending_renewal: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  revoked: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

export default function ExportCertificates() {
  const { certificates, loading, create, update, remove } = useExportCertificates();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ certificate_type: 'origin' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ certificate_type: 'origin' }); }
  };

  if (loading) return <div className="p-4 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const expiringSoon = certificates.filter(c => {
    if (!c.expiry_date || c.status === 'expired') return false;
    const days = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Certificates</h1>
          <p className="text-sm text-muted-foreground">{certificates.length} total · {expiringSoon.length} expiring soon</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Certificate</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Certificate</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={form.certificate_type} onValueChange={v => setForm(f => ({ ...f, certificate_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="origin">Certificate of Origin</SelectItem>
                    <SelectItem value="phytosanitary">Phytosanitary</SelectItem>
                    <SelectItem value="health">Health Certificate</SelectItem>
                    <SelectItem value="halal">Halal</SelectItem>
                    <SelectItem value="kosher">Kosher</SelectItem>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="iso">ISO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Certificate Number</Label><Input value={form.certificate_number || ''} onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} /></div>
              <div><Label>Issuing Authority</Label><Input value={form.issuing_authority || ''} onChange={e => setForm(f => ({ ...f, issuing_authority: e.target.value }))} /></div>
              <div><Label>Product Category</Label><Input value={form.product_category || ''} onChange={e => setForm(f => ({ ...f, product_category: e.target.value }))} /></div>
              <div><Label>Destination Country</Label><Input value={form.country_of_destination || ''} onChange={e => setForm(f => ({ ...f, country_of_destination: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Issue Date</Label><Input type="date" value={form.issue_date || ''} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><Label>Renewal Cost</Label><Input type="number" value={form.renewal_cost || ''} onChange={e => setForm(f => ({ ...f, renewal_cost: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">Add Certificate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {expiringSoon.length} certificate(s) expiring within 30 days
            </div>
          </CardContent>
        </Card>
      )}

      {certificates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />No certificates yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {certificates.map(c => {
            const daysLeft = c.expiry_date ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm capitalize">{c.certificate_type.replace('_', ' ')}</span>
                        <Badge variant="outline" className={statusColors[c.status] || ''}>{c.status.replace('_', ' ')}</Badge>
                      </div>
                      {c.certificate_number && <p className="text-sm text-muted-foreground">#{c.certificate_number}</p>}
                      <p className="text-xs text-muted-foreground">{c.issuing_authority}</p>
                      {c.country_of_destination && <p className="text-xs text-muted-foreground">→ {c.country_of_destination}</p>}
                      {daysLeft !== null && (
                        <p className={`text-xs mt-1 ${daysLeft <= 30 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {c.status === 'active' && daysLeft !== null && daysLeft <= 30 && (
                        <Button size="sm" variant="outline" onClick={() => update(c.id, { status: 'pending_renewal' })}>Renew</Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
