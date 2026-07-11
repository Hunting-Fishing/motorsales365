import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo, useUpdateModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SepticProfile() {
  const { shopId } = useShopId();
  const { data: info, isLoading } = useModuleDisplayInfo(shopId, 'septic');
  const { updateDisplayInfo } = useUpdateModuleDisplayInfo();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: '', display_phone: '', display_email: '', display_address: '', display_description: '' });

  useEffect(() => {
    if (info) {
      setForm({
        display_name: info.displayName || '',
        display_phone: info.displayPhone || '',
        display_email: info.displayEmail || '',
        display_address: info.displayAddress || '',
        display_description: info.displayDescription || '',
      });
    }
  }, [info]);

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      await updateDisplayInfo(shopId, 'septic', {
        display_name: form.display_name || null,
        display_phone: form.display_phone || null,
        display_email: form.display_email || null,
        display_address: form.display_address || null,
        display_description: form.display_description || null,
      });
      queryClient.invalidateQueries({ queryKey: ['module-display-info'] });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Module Profile</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Business Name</Label><Input value={form.display_name} onChange={(e) => setForm(p => ({ ...p, display_name: e.target.value }))} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Phone</Label><Input value={form.display_phone} onChange={(e) => setForm(p => ({ ...p, display_phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.display_email} onChange={(e) => setForm(p => ({ ...p, display_email: e.target.value }))} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input value={form.display_address} onChange={(e) => setForm(p => ({ ...p, display_address: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.display_description} onChange={(e) => setForm(p => ({ ...p, display_description: e.target.value }))} rows={3} /></div>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
