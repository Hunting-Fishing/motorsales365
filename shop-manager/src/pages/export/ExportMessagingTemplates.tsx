import React, { useState } from 'react';
import { useExportMessagingTemplates } from '@/hooks/export/useExportMessagingTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Loader2, Trash2, Mail, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
};

export default function ExportMessagingTemplates() {
  const { templates, loading, create, remove } = useExportMessagingTemplates();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ channel: 'email', category: 'order', language: 'en' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ channel: 'email', category: 'order', language: 'en' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messaging Templates</h1>
          <p className="text-muted-foreground">Pre-built email, WhatsApp, and SMS templates</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Template</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Messaging Template</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Template Name</Label><Input value={form.template_name || ''} onChange={e => setForm({...form, template_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Channel</Label>
                  <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Order</SelectItem>
                      <SelectItem value="shipment">Shipment</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.channel === 'email' && <div><Label>Subject</Label><Input value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} /></div>}
              <div><Label>Body</Label><Textarea rows={6} value={form.body || ''} onChange={e => setForm({...form, body: e.target.value})} placeholder="Use {{variable}} for dynamic content" /></div>
              <p className="text-xs text-muted-foreground">Available: {'{{customer_name}}, {{order_number}}, {{tracking_number}}, {{company_name}}'}</p>
            </div>
            <Button onClick={handleSubmit} className="w-full">Save Template</Button>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No messaging templates yet</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">{channelIcons[t.channel]}{t.template_name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t.channel}</Badge>
                  <Badge variant="secondary">{t.category}</Badge>
                  {!t.is_active && <Badge variant="destructive">Inactive</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {t.subject && <p className="text-sm font-medium mb-1">{t.subject}</p>}
                <p className="text-sm text-muted-foreground line-clamp-3">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
