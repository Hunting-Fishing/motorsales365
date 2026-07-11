import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Key, Copy, Trash2, Code2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ExportDeveloper() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTokens = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('api_tokens').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTokens(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTokens(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const tokenValue = `exp_${crypto.randomUUID().replace(/-/g, '')}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(tokenValue));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.from('api_tokens').insert({
      user_id: user.id,
      name: name.trim(),
      token_hash: tokenHash,
      permissions: { module: 'export', access: 'read_write' },
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Token created', description: `Save this token — it won't be shown again: ${tokenValue}` });
      await navigator.clipboard.writeText(tokenValue).catch(() => {});
    }
    setName('');
    setOpen(false);
    setCreating(false);
    fetchTokens();
  };

  const handleRevoke = async (id: string) => {
    await supabase.from('api_tokens').update({ is_active: false }).eq('id', id);
    toast({ title: 'Token revoked' });
    fetchTokens();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Developer Tools</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Token</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create API Token</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Token Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production Export API" /></div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">API Endpoints</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { method: 'GET', path: '/rest/v1/export_orders', desc: 'List export orders' },
            { method: 'GET', path: '/rest/v1/export_shipments', desc: 'List shipments' },
            { method: 'GET', path: '/rest/v1/export_products', desc: 'List products' },
            { method: 'GET', path: '/rest/v1/export_customers', desc: 'List clients' },
            { method: 'GET', path: '/rest/v1/export_invoices', desc: 'List invoices' },
            { method: 'POST', path: '/rest/v1/export_orders', desc: 'Create order' },
          ].map((ep, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Badge variant="outline" className={ep.method === 'GET' ? 'text-emerald-500 border-emerald-500/30' : 'text-blue-500 border-blue-500/30'}>{ep.method}</Badge>
              <code className="text-xs text-foreground flex-1 truncate">{ep.path}</code>
              <span className="text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(ep.path); toast({ title: 'Copied' }); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">API Tokens ({tokens.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No API tokens created yet.</p>
          ) : tokens.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(t.created_at).toLocaleDateString()}
                  {t.last_used_at && ` • Last used ${new Date(t.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant={t.is_active ? 'default' : 'outline'}>{t.is_active ? 'Active' : 'Revoked'}</Badge>
              {t.is_active && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRevoke(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
