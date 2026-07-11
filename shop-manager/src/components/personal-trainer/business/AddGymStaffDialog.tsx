import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from '@/hooks/use-toast';

const STAFF_ROLES = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'manager', label: 'Manager' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'staff', label: 'General Staff' },
];

interface AddGymStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingStaff?: any;
}

export function AddGymStaffDialog({ open, onOpenChange, onSuccess, editingStaff }: AddGymStaffDialogProps) {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'staff',
    department: '',
    hourly_rate: '',
    hire_date: '',
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    if (editingStaff) {
      setForm({
        first_name: editingStaff.first_name || '',
        last_name: editingStaff.last_name || '',
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        role: editingStaff.role || 'staff',
        department: editingStaff.department || '',
        hourly_rate: editingStaff.hourly_rate?.toString() || '',
        hire_date: editingStaff.hire_date || '',
        is_active: editingStaff.is_active ?? true,
        notes: editingStaff.notes || '',
      });
    } else {
      setForm({
        first_name: '', last_name: '', email: '', phone: '', role: 'staff',
        department: '', hourly_rate: '', hire_date: '', is_active: true, notes: '',
      });
    }
  }, [editingStaff, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !form.first_name || !form.last_name) return;
    setLoading(true);

    const payload = {
      shop_id: shopId,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      department: form.department || null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
      hire_date: form.hire_date || null,
      is_active: form.is_active,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingStaff) {
        const { error } = await supabase.from('pt_gym_staff').update(payload).eq('id', editingStaff.id);
        if (error) throw error;
        toast({ title: 'Staff member updated' });
      } else {
        const { error } = await supabase.from('pt_gym_staff').insert(payload);
        if (error) throw error;
        toast({ title: 'Staff member added' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            <Label>Active</Label>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : editingStaff ? 'Update' : 'Add Staff'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
