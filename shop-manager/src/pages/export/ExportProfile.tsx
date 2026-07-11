import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Building2 } from 'lucide-react';
import { useExportBusinessProfile } from '@/hooks/export/useExportBusinessProfile';

export default function ExportProfile() {
  const { profile, loading, save } = useExportBusinessProfile();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const u = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const { id, shop_id, created_at, updated_at, ...rest } = form;
    await save(rest);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Company Name</Label><Input value={form.company_name || ''} onChange={e => u('company_name', e.target.value)} /></div>
            <div><Label>Legal Name</Label><Input value={form.legal_name || ''} onChange={e => u('legal_name', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Business Type</Label><Input value={form.business_type || ''} onChange={e => u('business_type', e.target.value)} /></div>
            <div><Label>Registration #</Label><Input value={form.registration_number || ''} onChange={e => u('registration_number', e.target.value)} /></div>
            <div><Label>Tax ID</Label><Input value={form.tax_id || ''} onChange={e => u('tax_id', e.target.value)} /></div>
          </div>
          <div><Label>VAT Number</Label><Input value={form.vat_number || ''} onChange={e => u('vat_number', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Address</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Address Line 1</Label><Input value={form.address_line1 || ''} onChange={e => u('address_line1', e.target.value)} /></div>
          <div><Label>Address Line 2</Label><Input value={form.address_line2 || ''} onChange={e => u('address_line2', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={form.city || ''} onChange={e => u('city', e.target.value)} /></div>
            <div><Label>State / Province</Label><Input value={form.state_province || ''} onChange={e => u('state_province', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Postal Code</Label><Input value={form.postal_code || ''} onChange={e => u('postal_code', e.target.value)} /></div>
            <div><Label>Country</Label><Input value={form.country || ''} onChange={e => u('country', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => u('phone', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => u('email', e.target.value)} /></div>
          </div>
          <div><Label>Website</Label><Input value={form.website || ''} onChange={e => u('website', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Primary Contact</Label><Input value={form.primary_contact_name || ''} onChange={e => u('primary_contact_name', e.target.value)} /></div>
            <div><Label>Contact Email</Label><Input value={form.primary_contact_email || ''} onChange={e => u('primary_contact_email', e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={form.primary_contact_phone || ''} onChange={e => u('primary_contact_phone', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Banking</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Bank Name</Label><Input value={form.bank_name || ''} onChange={e => u('bank_name', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Account #</Label><Input value={form.bank_account_number || ''} onChange={e => u('bank_account_number', e.target.value)} /></div>
            <div><Label>SWIFT</Label><Input value={form.bank_swift_code || ''} onChange={e => u('bank_swift_code', e.target.value)} /></div>
            <div><Label>IBAN</Label><Input value={form.bank_iban || ''} onChange={e => u('bank_iban', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Licensing & Customs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Export License #</Label><Input value={form.export_license_number || ''} onChange={e => u('export_license_number', e.target.value)} /></div>
            <div><Label>License Expiry</Label><Input type="date" value={form.export_license_expiry || ''} onChange={e => u('export_license_expiry', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customs Broker</Label><Input value={form.customs_broker_name || ''} onChange={e => u('customs_broker_name', e.target.value)} /></div>
            <div><Label>Broker Contact</Label><Input value={form.customs_broker_contact || ''} onChange={e => u('customs_broker_contact', e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => u('notes', e.target.value)} rows={3} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
