import React, { useState } from 'react';
import { useExportPortalAccess } from '@/hooks/export/useExportPortalAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function ExportCustomerPortal() {
  const { accessList, loading, create, update, remove } = useExportPortalAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    const token = crypto.randomUUID();
    const ok = await create({ ...form, access_token: token });
    if (ok) { setOpen(false); setForm({}); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
          <p className="text-muted-foreground">Manage client self-service access for tracking and documents</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Grant Access</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Grant Portal Access</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Customer ID</Label><Input value={form.customer_id || ''} onChange={e => setForm({...form, customer_id: e.target.value})} placeholder="Paste customer UUID" /></div>
            </div>
            <Button onClick={handleSubmit} className="w-full">Grant Access</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{accessList.length}</p><p className="text-xs text-muted-foreground">Total Accounts</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-emerald-600">{accessList.filter(a => a.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{accessList.filter(a => !a.is_active).length}</p><p className="text-xs text-muted-foreground">Inactive</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Portal Accounts</CardTitle></CardHeader>
        <CardContent>
          {accessList.length === 0 ? <p className="text-center py-8 text-muted-foreground">No portal accounts</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Permissions</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {accessList.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.export_customers?.company_name || a.export_customers?.contact_name || a.customer_id?.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge className={a.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{a.last_login ? new Date(a.last_login).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {a.permissions?.view_orders && <Badge variant="outline" className="text-xs">Orders</Badge>}
                          {a.permissions?.view_shipments && <Badge variant="outline" className="text-xs">Shipments</Badge>}
                          {a.permissions?.download_documents && <Badge variant="outline" className="text-xs">Docs</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => update(a.id, { is_active: !a.is_active })}>
                          {a.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
