import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Users, Phone, Mail, ChevronRight, Search, Filter, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'installer', label: 'Installer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'pump_operator', label: 'Pump Operator' },
  { value: 'manager', label: 'Manager' },
  { value: 'reception', label: 'Reception' },
  { value: 'technician', label: 'Technician' },
  { value: 'laborer', label: 'Laborer' },
];

const ROLE_COLORS: Record<string, string> = {
  driver: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  installer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  inspector: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pump_operator: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  manager: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  reception: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  technician: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  laborer: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400',
};

export default function SepticStaff() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', hire_date: '', hourly_rate: '', home_address: '', roles: [] as string[], status: 'active'
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['septic-employees', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employees')
        .select('*, septic_employee_roles(id, role, is_primary)')
        .eq('shop_id', shopId)
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const addEmployee = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const { data: emp, error } = await supabase.from('septic_employees').insert({
        shop_id: shopId,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        email: form.email || null,
        hire_date: form.hire_date || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        home_address: form.home_address || null,
        status: form.status,
      }).select('id').single();
      if (error) throw error;

      if (form.roles.length > 0) {
        const roleInserts = form.roles.map((role, i) => ({
          employee_id: emp.id,
          role,
          is_primary: i === 0,
        }));
        const { error: roleError } = await supabase.from('septic_employee_roles').insert(roleInserts);
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      toast.success('Employee added');
      queryClient.invalidateQueries({ queryKey: ['septic-employees'] });
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', phone: '', email: '', hire_date: '', hourly_rate: '', home_address: '', roles: [], status: 'active' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRole = (role: string) => {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role]
    }));
  };

  const filtered = employees.filter((e: any) => {
    const matchesSearch = !search || `${e.first_name} ${e.last_name} ${e.email || ''} ${e.phone || ''}`.toLowerCase().includes(search.toLowerCase());
    const roles = (e.septic_employee_roles || []) as any[];
    const matchesRole = roleFilter === 'all' || roles.some((r: any) => r.role === roleFilter);
    return matchesSearch && matchesRole;
  });

  const statusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-emerald-600 to-teal-700">
          <Plus className="h-4 w-4 mr-2" />Add Employee
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">{employees.length === 0 ? 'No employees added yet' : 'No employees match your filter'}</p>
          {employees.length === 0 && <Button onClick={() => setShowAdd(true)} variant="outline">Add first employee</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e: any) => {
            const roles = (e.septic_employee_roles || []) as any[];
            return (
              <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/septic/employees/${e.id}`)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{e.first_name} {e.last_name}</span>
                      <Badge className={statusColor(e.status)}>{e.status}</Badge>
                    </div>
                    {roles.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {roles.map((r: any) => (
                          <Badge key={r.id} variant="outline" className={`text-xs ${ROLE_COLORS[r.role] || ''}`}>
                            {r.is_primary && <Shield className="h-2.5 w-2.5 mr-0.5" />}
                            {ROLE_OPTIONS.find(o => o.value === r.role)?.label || r.role}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {e.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{e.phone}</span>}
                      {e.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{e.email}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={form.hire_date} onChange={e => setForm(p => ({ ...p, hire_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div className="space-y-2"><Label>Home Address</Label><Input value={form.home_address} onChange={e => setForm(p => ({ ...p, home_address: e.target.value }))} placeholder="Employee address" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-accent/50">
                    <Checkbox checked={form.roles.includes(r.value)} onCheckedChange={() => toggleRole(r.value)} />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addEmployee.mutate()} disabled={!form.first_name || !form.last_name || addEmployee.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {addEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
