import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportClients, useExportClientContacts } from '@/hooks/export/useExportClients';
import { Plus, Search, Loader2, Globe, Building2, Users, CreditCard, FileText, ArrowLeft, UserPlus, Trash2, Star } from 'lucide-react';

const EMPTY_FORM = {
  company_name: '', contact_name: '', email: '', phone: '', country: '', city: '', address: '',
  state_province: '', postal_code: '', website: '', client_type: 'b2b',
  port_of_destination: '', trade_terms: 'FOB', incoterms: 'FOB', currency: 'USD', payment_terms: 'Net 30',
  tax_id: '', credit_limit: 0, discount_rate: 0, discount_type: 'percentage',
  import_license_number: '', labeling_requirements: '', customs_broker_name: '', customs_broker_contact: '',
  consignee_name: '', notify_party: '', preferred_shipping_line: '', preferred_container_type: '20ft',
  notes: ''
};

const CONTACT_EMPTY = { contact_name: '', role: '', email: '', phone: '', whatsapp: '', is_primary: false, notes: '' };

function ClientDetail({ client, onBack }: { client: any; onBack: () => void }) {
  const { contacts, loading: loadingContacts, create: createContact, remove: removeContact } = useExportClientContacts(client.id);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ ...CONTACT_EMPTY });

  const handleAddContact = async () => {
    if (!contactForm.contact_name) return;
    const ok = await createContact(contactForm);
    if (ok) { setContactDialogOpen(false); setContactForm({ ...CONTACT_EMPTY }); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">{client.country}{client.city ? `, ${client.city}` : ''} • {client.client_type?.toUpperCase() || 'B2B'}</p>
        </div>
        <Badge variant={client.is_active ? 'default' : 'secondary'} className="ml-auto">{client.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" />Info</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 mr-1" />Contacts</TabsTrigger>
          <TabsTrigger value="trade"><Globe className="h-4 w-4 mr-1" />Trade</TabsTrigger>
          <TabsTrigger value="credit"><CreditCard className="h-4 w-4 mr-1" />Credit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 mt-3">
          <Card><CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{client.contact_name || '—'}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{client.email || '—'}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{client.phone || '—'}</span></div>
              <div><span className="text-muted-foreground">Website:</span> <span className="text-foreground">{client.website || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{[client.address, client.city, client.state_province, client.postal_code, client.country].filter(Boolean).join(', ') || '—'}</span></div>
              <div><span className="text-muted-foreground">Tax ID:</span> <span className="text-foreground">{client.tax_id || '—'}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{client.client_type?.toUpperCase() || 'B2B'}</span></div>
            </div>
          </CardContent></Card>
          {client.notes && <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{client.notes}</p></CardContent></Card>}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Contacts ({contacts.length})</h3>
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={contactForm.contact_name} onChange={e => setContactForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
                  <div><Label>Role</Label><Input placeholder="e.g. Buyer, Logistics Manager" value={contactForm.role} onChange={e => setContactForm(p => ({ ...p, role: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} /></div>
                  </div>
                  <div><Label>WhatsApp</Label><Input value={contactForm.whatsapp} onChange={e => setContactForm(p => ({ ...p, whatsapp: e.target.value }))} /></div>
                  <Button onClick={handleAddContact} className="w-full">Add Contact</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {loadingContacts ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : contacts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No contacts added yet</p> : contacts.map(c => (
            <Card key={c.id}><CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{c.contact_name}</p>
                  {c.is_primary && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{c.role || 'No role'} • {c.email || ''} {c.phone ? `• ${c.phone}` : ''}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeContact(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="trade" className="space-y-3 mt-3">
          <Card><CardContent className="p-4 space-y-2">
            <h4 className="font-semibold text-foreground">Trade Terms</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Incoterms:</span> <span className="text-foreground">{client.incoterms || client.trade_terms || 'FOB'}</span></div>
              <div><span className="text-muted-foreground">Currency:</span> <span className="text-foreground">{client.currency || 'USD'}</span></div>
              <div><span className="text-muted-foreground">Payment Terms:</span> <span className="text-foreground">{client.payment_terms || 'Net 30'}</span></div>
              <div><span className="text-muted-foreground">Port:</span> <span className="text-foreground">{client.port_of_destination || '—'}</span></div>
              <div><span className="text-muted-foreground">Shipping Line:</span> <span className="text-foreground">{client.preferred_shipping_line || '—'}</span></div>
              <div><span className="text-muted-foreground">Container:</span> <span className="text-foreground">{client.preferred_container_type || '20ft'}</span></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-2">
            <h4 className="font-semibold text-foreground">Import Requirements</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Import License:</span> <span className="text-foreground">{client.import_license_number || '—'}</span></div>
              <div><span className="text-muted-foreground">Customs Broker:</span> <span className="text-foreground">{client.customs_broker_name || '—'}</span></div>
              <div><span className="text-muted-foreground">Consignee:</span> <span className="text-foreground">{client.consignee_name || '—'}</span></div>
              <div><span className="text-muted-foreground">Notify Party:</span> <span className="text-foreground">{client.notify_party || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Labeling:</span> <span className="text-foreground">{client.labeling_requirements || '—'}</span></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="credit" className="space-y-3 mt-3">
          <Card><CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Credit Limit:</span> <span className="text-foreground font-semibold">${Number(client.credit_limit || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Outstanding:</span> <span className="text-foreground font-semibold">${Number(client.outstanding_balance || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Discount:</span> <span className="text-foreground">{client.discount_rate || 0}% ({client.discount_type || 'percentage'})</span></div>
              <div><span className="text-muted-foreground">Reliability:</span> <Badge variant={client.payment_reliability === 'excellent' ? 'default' : client.payment_reliability === 'good' ? 'secondary' : 'destructive'}>{client.payment_reliability || 'good'}</Badge></div>
              <div><span className="text-muted-foreground">Total Orders:</span> <span className="text-foreground">{client.total_orders || 0}</span></div>
              <div><span className="text-muted-foreground">Total Revenue:</span> <span className="text-foreground font-semibold">${Number(client.total_revenue || 0).toLocaleString()}</span></div>
              {client.last_order_date && <div className="col-span-2"><span className="text-muted-foreground">Last Order:</span> <span className="text-foreground">{new Date(client.last_order_date).toLocaleDateString()}</span></div>}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ExportCustomers() {
  const { clients, loading, create } = useExportClients();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [tab, setTab] = useState('company');

  const handleCreate = async () => {
    if (!form.company_name || !form.country) return;
    const ok = await create(form);
    if (ok) { setDialogOpen(false); setForm({ ...EMPTY_FORM }); }
  };

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) return <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Export Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Client</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add International Client</DialogTitle></DialogHeader>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="import">Import</TabsTrigger>
              </TabsList>

              <TabsContent value="company" className="space-y-3 mt-3">
                <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.client_type} onValueChange={v => setForm(p => ({ ...p, client_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="b2b">B2B</SelectItem><SelectItem value="b2c">B2C</SelectItem><SelectItem value="broker">Broker</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Country *</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></div>
                <div><Label>Tax ID</Label><Input value={form.tax_id} onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))} /></div>
              </TabsContent>

              <TabsContent value="trade" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Incoterms</Label>
                    <Select value={form.incoterms} onValueChange={v => setForm(p => ({ ...p, incoterms: v, trade_terms: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Currency</Label>
                    <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['USD','EUR','GBP','CAD','AUD','JPY','CNY','BRL','MXN','HTG'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Payment Terms</Label>
                    <Select value={form.payment_terms} onValueChange={v => setForm(p => ({ ...p, payment_terms: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Prepaid','Net 15','Net 30','Net 45','Net 60','Net 90','LC','CAD'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Port of Destination</Label><Input value={form.port_of_destination} onChange={e => setForm(p => ({ ...p, port_of_destination: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Credit Limit ($)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm(p => ({ ...p, credit_limit: Number(e.target.value) }))} /></div>
                  <div><Label>Discount (%)</Label><Input type="number" value={form.discount_rate} onChange={e => setForm(p => ({ ...p, discount_rate: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Shipping Line</Label><Input value={form.preferred_shipping_line} onChange={e => setForm(p => ({ ...p, preferred_shipping_line: e.target.value }))} /></div>
                  <div><Label>Container</Label>
                    <Select value={form.preferred_container_type} onValueChange={v => setForm(p => ({ ...p, preferred_container_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="20ft">20ft</SelectItem><SelectItem value="40ft">40ft</SelectItem><SelectItem value="40ft HC">40ft HC</SelectItem><SelectItem value="reefer">Reefer</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="import" className="space-y-3 mt-3">
                <div><Label>Import License #</Label><Input value={form.import_license_number} onChange={e => setForm(p => ({ ...p, import_license_number: e.target.value }))} /></div>
                <div><Label>Customs Broker</Label><Input value={form.customs_broker_name} onChange={e => setForm(p => ({ ...p, customs_broker_name: e.target.value }))} /></div>
                <div><Label>Customs Broker Contact</Label><Input value={form.customs_broker_contact} onChange={e => setForm(p => ({ ...p, customs_broker_contact: e.target.value }))} /></div>
                <div><Label>Consignee</Label><Input value={form.consignee_name} onChange={e => setForm(p => ({ ...p, consignee_name: e.target.value }))} /></div>
                <div><Label>Notify Party</Label><Input value={form.notify_party} onChange={e => setForm(p => ({ ...p, notify_party: e.target.value }))} /></div>
                <div><Label>Labeling Requirements</Label><Textarea value={form.labeling_requirements} onChange={e => setForm(p => ({ ...p, labeling_requirements: e.target.value }))} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleCreate} className="w-full mt-4">Add Client</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clients..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No clients found</p> : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedClient(c)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{c.company_name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.client_type?.toUpperCase() || 'B2B'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.contact_name || 'No contact'} • {c.country}{c.city ? `, ${c.city}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{c.incoterms || c.trade_terms || 'FOB'} • {c.currency || 'USD'} • {c.payment_terms || 'Net 30'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={c.is_active !== false ? 'default' : 'secondary'} className="text-[10px]">{c.is_active !== false ? 'Active' : 'Inactive'}</Badge>
                    {Number(c.total_orders || 0) > 0 && <p className="text-xs text-muted-foreground mt-1">{c.total_orders} orders</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
