import React, { useState } from 'react';
import { useExportEdiConnections } from '@/hooks/export/useExportEdiConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Cable, Loader2, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExportEdiHub() {
  const { connections, loading, create, update, remove } = useExportEdiConnections();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ connection_type: 'API', protocol: 'REST', auth_type: 'api_key', status: 'inactive' });

  const handleSubmit = async () => {
    const ok = await create(form);
    if (ok) { setOpen(false); setForm({ connection_type: 'API', protocol: 'REST', auth_type: 'api_key', status: 'inactive' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EDI / API Hub</h1>
          <p className="text-muted-foreground">Electronic data interchange and API integrations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New Connection</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New EDI/API Connection</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Connection Name</Label><Input value={form.connection_name || ''} onChange={e => setForm({...form, connection_name: e.target.value})} /></div>
              <div><Label>Partner Name</Label><Input value={form.partner_name || ''} onChange={e => setForm({...form, partner_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label>
                  <Select value={form.connection_type} onValueChange={v => setForm({...form, connection_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="API">API</SelectItem>
                      <SelectItem value="EDI">EDI</SelectItem>
                      <SelectItem value="SFTP">SFTP</SelectItem>
                      <SelectItem value="AS2">AS2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Protocol</Label>
                  <Select value={form.protocol} onValueChange={v => setForm({...form, protocol: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REST">REST</SelectItem>
                      <SelectItem value="SOAP">SOAP</SelectItem>
                      <SelectItem value="X12">X12</SelectItem>
                      <SelectItem value="EDIFACT">EDIFACT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Endpoint URL</Label><Input value={form.endpoint_url || ''} onChange={e => setForm({...form, endpoint_url: e.target.value})} placeholder="https://..." /></div>
              <div><Label>Auth Type</Label>
                <Select value={form.auth_type} onValueChange={v => setForm({...form, auth_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Create Connection</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{connections.length}</p><p className="text-xs text-muted-foreground">Connections</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-emerald-600">{connections.filter(c => c.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{connections.reduce((s, c) => s + (c.message_count || 0), 0)}</p><p className="text-xs text-muted-foreground">Messages</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{connections.reduce((s, c) => s + (c.error_count || 0), 0)}</p><p className="text-xs text-muted-foreground">Errors</p></CardContent></Card>
      </div>

      {connections.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No EDI/API connections configured</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connections.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {c.status === 'active' ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                    {c.connection_name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => update(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })}>
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{c.connection_type}</Badge>
                  <Badge variant="outline">{c.protocol}</Badge>
                  <Badge variant="outline">{c.auth_type}</Badge>
                  <Badge className={c.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}>{c.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Partner: {c.partner_name}</p>
                {c.endpoint_url && <p className="text-xs text-muted-foreground font-mono truncate">{c.endpoint_url}</p>}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Messages: {c.message_count}</span>
                  <span>Errors: {c.error_count}</span>
                  {c.last_sync_at && <span>Last sync: {new Date(c.last_sync_at).toLocaleDateString()}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
