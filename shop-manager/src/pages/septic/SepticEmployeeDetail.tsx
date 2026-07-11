import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, Phone, Mail, MapPin, Loader2, Calendar, Shield, Award, Plus, AlertTriangle, CheckCircle2, Clock, FileText, Receipt, BarChart3, Save, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

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

export default function SepticEmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [showAddCert, setShowAddCert] = useState(false);
  const [showAddCertType, setShowAddCertType] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [certForm, setCertForm] = useState({
    certification_type_id: '', certificate_number: '', issue_date: '', expiry_date: '', issuing_authority: '', notes: ''
  });
  const [newCertType, setNewCertType] = useState({
    name: '', category: 'certification', requires_renewal: true, default_validity_months: '24', description: ''
  });

  // Editable profile fields
  const [profile, setProfile] = useState({
    first_name: '', last_name: '', phone: '', email: '', home_address: '',
    emergency_contact_name: '', emergency_contact_phone: '', hourly_rate: '', hire_date: '', notes: '', status: 'active'
  });

  const { data: employee, isLoading } = useQuery({
    queryKey: ['septic-employee', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('septic_employees')
        .select('*, septic_employee_roles(id, role, is_primary)')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          email: data.email || '',
          home_address: data.home_address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          hourly_rate: data.hourly_rate ? String(data.hourly_rate) : '',
          hire_date: data.hire_date || '',
          notes: data.notes || '',
          status: data.status || 'active',
        });
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['septic-employee-certs', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('septic_employee_certifications')
        .select('*, septic_certification_types(name, category, requires_renewal)')
        .eq('employee_id', id)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: certTypes = [] } = useQuery({
    queryKey: ['septic-cert-types', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_certification_types')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Service orders assigned to this employee
  const { data: serviceOrders = [] } = useQuery({
    queryKey: ['septic-employee-orders', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, service_type, status, scheduled_date, priority, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .or(`assigned_employee_id.eq.${id},assigned_driver_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
  });

  // Invoices tied to this employee
  const { data: invoices = [] } = useQuery({
    queryKey: ['septic-employee-invoices', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_invoices')
        .select('id, invoice_number, status, total, created_at, septic_customers(first_name, last_name)')
        .eq('shop_id', shopId)
        .eq('assigned_employee_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
  });

  // Completions (legacy history)
  const { data: completions = [] } = useQuery({
    queryKey: ['septic-employee-completions', id, shopId],
    queryFn: async () => {
      if (!id || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_completions')
        .select('id, completion_date, gallons_pumped, waste_type, total_cost')
        .eq('shop_id', shopId)
        .eq('driver_id', id)
        .order('completion_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!shopId,
  });

  const saveProfile = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('septic_employees').update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone || null,
        email: profile.email || null,
        home_address: profile.home_address || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        hourly_rate: profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
        hire_date: profile.hire_date || null,
        notes: profile.notes || null,
        status: profile.status,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Profile saved');
      queryClient.invalidateQueries({ queryKey: ['septic-employee', id] });
      setEditMode(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = useMutation({
    mutationFn: async ({ role, hasRole, roleId }: { role: string; hasRole: boolean; roleId?: string }) => {
      if (!id) throw new Error('No employee');
      if (hasRole && roleId) {
        const { error } = await supabase.from('septic_employee_roles').delete().eq('id', roleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('septic_employee_roles').insert({ employee_id: id, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-employee', id] });
      toast.success('Roles updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCert = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No employee');
      const { error } = await supabase.from('septic_employee_certifications').insert({
        employee_id: id,
        certification_type_id: certForm.certification_type_id,
        certificate_number: certForm.certificate_number || null,
        issue_date: certForm.issue_date || null,
        expiry_date: certForm.expiry_date || null,
        issuing_authority: certForm.issuing_authority || null,
        notes: certForm.notes || null,
        status: 'valid',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Certification added');
      queryClient.invalidateQueries({ queryKey: ['septic-employee-certs', id] });
      setShowAddCert(false);
      setCertForm({ certification_type_id: '', certificate_number: '', issue_date: '', expiry_date: '', issuing_authority: '', notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getCertStatus = (cert: any) => {
    if (!cert.expiry_date) return { label: 'No Expiry', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 };
    const days = differenceInDays(new Date(cert.expiry_date), new Date());
    if (days < 0) return { label: 'Expired', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle };
    if (days <= 30) return { label: `${days}d left`, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock };
    if (days <= 90) return { label: `${days}d left`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
    return { label: 'Valid', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 };
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!employee) return <div className="p-6"><p className="text-muted-foreground">Employee not found</p></div>;

  const roles = (employee.septic_employee_roles || []) as any[];

  // Activity summary stats
  const totalOrders = serviceOrders.length;
  const completedOrders = serviceOrders.filter((o: any) => o.status === 'completed').length;
  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
  const completionRevenue = completions.reduce((sum: number, c: any) => sum + Number(c.total_cost || 0), 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-destructive/10 text-destructive',
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    overdue: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/septic/staff')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
          <div className="flex gap-1 mt-1 flex-wrap">
            <Badge className={employee.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}>{employee.status}</Badge>
            {roles.map((r: any) => (
              <Badge key={r.id} variant="outline" className="text-xs">
                {ROLE_OPTIONS.find(o => o.value === r.role)?.label || r.role}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="w-max">
            <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="roles"><Shield className="h-3.5 w-3.5 mr-1" />Roles</TabsTrigger>
            <TabsTrigger value="certifications"><Award className="h-3.5 w-3.5 mr-1" />Certs</TabsTrigger>
            <TabsTrigger value="orders"><FileText className="h-3.5 w-3.5 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="invoices"><Receipt className="h-3.5 w-3.5 mr-1" />Invoices</TabsTrigger>
            <TabsTrigger value="activity"><BarChart3 className="h-3.5 w-3.5 mr-1" />Activity</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* ── Profile Tab ─── */}
        <TabsContent value="profile" className="space-y-4">
          <div className="flex justify-end">
            {editMode ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button size="sm" onClick={saveProfile} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}<Save className="h-4 w-4 mr-1" />Save
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>Edit Profile</Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">First Name</Label><Input value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Last Name</Label><Input value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Home Address</Label><Input value={profile.home_address} onChange={e => setProfile(p => ({ ...p, home_address: e.target.value }))} /></div>
                  </>
                ) : (
                  <>
                    {employee.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{employee.phone}</div>}
                    {employee.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{employee.email}</div>}
                    {employee.home_address && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{employee.home_address}</div>}
                    {!employee.phone && !employee.email && !employee.home_address && <p className="text-sm text-muted-foreground">No contact info on file</p>}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Hire Date</Label><Input type="date" value={profile.hire_date} onChange={e => setProfile(p => ({ ...p, hire_date: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Hourly Rate ($)</Label><Input type="number" step="0.01" value={profile.hourly_rate} onChange={e => setProfile(p => ({ ...p, hourly_rate: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={profile.status} onValueChange={v => setProfile(p => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 text-sm">
                    {employee.hire_date && <div className="flex justify-between"><span className="text-muted-foreground">Hire Date</span><span>{format(new Date(employee.hire_date), 'MMM d, yyyy')}</span></div>}
                    {employee.hourly_rate && <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span>${Number(employee.hourly_rate).toFixed(2)}/hr</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{employee.status}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={profile.emergency_contact_name} onChange={e => setProfile(p => ({ ...p, emergency_contact_name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={profile.emergency_contact_phone} onChange={e => setProfile(p => ({ ...p, emergency_contact_phone: e.target.value }))} /></div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  {employee.emergency_contact_name ? <p>{employee.emergency_contact_name}</p> : null}
                  {employee.emergency_contact_phone ? <p className="text-muted-foreground">{employee.emergency_contact_phone}</p> : null}
                  {!employee.emergency_contact_name && !employee.emergency_contact_phone && <p className="text-muted-foreground">No emergency contact on file</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {editMode && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={profile.notes} onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Internal notes about this employee..." />
              </CardContent>
            </Card>
          )}
          {!editMode && employee.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{employee.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Roles Tab ─── */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" />Job Roles</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(opt => {
                  const existing = roles.find((r: any) => r.role === opt.value);
                  return (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${existing ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'hover:bg-accent/50'}`}>
                      <Checkbox
                        checked={!!existing}
                        onCheckedChange={() => toggleRole.mutate({ role: opt.value, hasRole: !!existing, roleId: existing?.id })}
                        disabled={toggleRole.isPending}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                      {existing?.is_primary && <Badge variant="outline" className="text-xs ml-auto">Primary</Badge>}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certifications Tab ─── */}
        <TabsContent value="certifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Certifications & Training</h3>
            <Button size="sm" onClick={() => setShowAddCert(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
          {certifications.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No certifications recorded</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert: any) => {
                const status = getCertStatus(cert);
                const StatusIcon = status.icon;
                const certType = cert.septic_certification_types as any;
                return (
                  <Card key={cert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{certType?.name || 'Unknown'}</span>
                            <Badge className={`${status.color} text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                            </Badge>
                          </div>
                          {certType?.category && <Badge variant="outline" className="text-xs capitalize">{certType.category}</Badge>}
                          {cert.certificate_number && <p className="text-xs text-muted-foreground">#{cert.certificate_number}</p>}
                          {cert.issuing_authority && <p className="text-xs text-muted-foreground">{cert.issuing_authority}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          {cert.issue_date && <p>Issued: {format(new Date(cert.issue_date), 'MMM d, yyyy')}</p>}
                          {cert.expiry_date && <p>Expires: {format(new Date(cert.expiry_date), 'MMM d, yyyy')}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Service Orders Tab ─── */}
        <TabsContent value="orders" className="space-y-4">
          <h3 className="font-semibold">Assigned Service Orders ({serviceOrders.length})</h3>
          {serviceOrders.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No service orders assigned yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {serviceOrders.map((order: any) => {
                const cust = order.septic_customers as any;
                return (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/septic/orders/${order.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{order.order_number || 'Draft'}</span>
                            <Badge className={statusColors[order.status] || 'bg-muted text-muted-foreground'}>{order.status}</Badge>
                            {order.priority === 'urgent' && <Badge className="bg-destructive/10 text-destructive text-xs">Urgent</Badge>}
                          </div>
                          {cust && <p className="text-xs text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                          <p className="text-xs text-muted-foreground capitalize">{order.service_type?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {order.scheduled_date && <p>{format(new Date(order.scheduled_date), 'MMM d, yyyy')}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Invoices Tab ─── */}
        <TabsContent value="invoices" className="space-y-4">
          <h3 className="font-semibold">Invoices ({invoices.length})</h3>
          {invoices.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No invoices tied to this employee yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => {
                const cust = inv.septic_customers as any;
                return (
                  <Card key={inv.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{inv.invoice_number || 'Draft'}</span>
                            <Badge className={statusColors[inv.status] || 'bg-muted text-muted-foreground'}>{inv.status}</Badge>
                          </div>
                          {cust && <p className="text-xs text-muted-foreground">{cust.first_name} {cust.last_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${Number(inv.total || 0).toFixed(2)}</p>
                          {inv.created_at && <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'MMM d, yyyy')}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Activity Summary Tab ─── */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">${(totalRevenue + completionRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{completions.length}</p>
                <p className="text-xs text-muted-foreground">Completions</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent completions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Completions</CardTitle></CardHeader>
            <CardContent>
              {completions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
              ) : (
                <div className="space-y-2">
                  {completions.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{c.waste_type || 'Pump-out'}</p>
                        {c.completion_date && <p className="text-xs text-muted-foreground">{format(new Date(c.completion_date), 'MMM d, yyyy')}</p>}
                      </div>
                      <div className="text-right text-sm">
                        {c.gallons_pumped && <p>{c.gallons_pumped} gal</p>}
                        {c.total_cost && <p className="text-muted-foreground">${Number(c.total_cost).toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Certification Dialog */}
      <Dialog open={showAddCert} onOpenChange={setShowAddCert}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Certification Type *</Label>
              <Select value={certForm.certification_type_id} onValueChange={v => {
                if (v === '__add_new__') {
                  setShowAddCertType(true);
                } else {
                  setCertForm(p => ({ ...p, certification_type_id: v }));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {certTypes.map((ct: any) => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-emerald-600 font-medium border-t mt-1 pt-1">
                    <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add New Type...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Certificate Number</Label><Input value={certForm.certificate_number} onChange={e => setCertForm(p => ({ ...p, certificate_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Issue Date</Label><Input type="date" value={certForm.issue_date} onChange={e => setCertForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={certForm.expiry_date} onChange={e => setCertForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Issuing Authority</Label><Input value={certForm.issuing_authority} onChange={e => setCertForm(p => ({ ...p, issuing_authority: e.target.value }))} placeholder="e.g. DOT, OSHA, State Board" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={certForm.notes} onChange={e => setCertForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCert(false)}>Cancel</Button>
            <Button onClick={() => addCert.mutate()} disabled={!certForm.certification_type_id || addCert.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {addCert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Certification Type Dialog */}
      <Dialog open={showAddCertType} onOpenChange={setShowAddCertType}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Certification Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newCertType.name} onChange={e => setNewCertType(p => ({ ...p, name: e.target.value }))} placeholder="e.g. State Installer License" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCertType.category} onValueChange={v => setNewCertType(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="endorsement">Endorsement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newCertType.description} onChange={e => setNewCertType(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={newCertType.requires_renewal} onCheckedChange={v => setNewCertType(p => ({ ...p, requires_renewal: !!v }))} />
              <Label>Requires Renewal</Label>
            </div>
            {newCertType.requires_renewal && (
              <div className="space-y-2">
                <Label>Default Validity (months)</Label>
                <Input type="number" value={newCertType.default_validity_months} onChange={e => setNewCertType(p => ({ ...p, default_validity_months: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCertType(false)}>Cancel</Button>
            <Button
              disabled={!newCertType.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!shopId || !newCertType.name.trim()) return;
                try {
                  const { data, error } = await supabase.from('septic_certification_types').insert({
                    shop_id: shopId,
                    name: newCertType.name.trim(),
                    category: newCertType.category,
                    description: newCertType.description || null,
                    requires_renewal: newCertType.requires_renewal,
                    default_validity_months: newCertType.requires_renewal && newCertType.default_validity_months ? parseInt(newCertType.default_validity_months) : null,
                  }).select('id').single();
                  if (error) throw error;
                  toast.success(`"${newCertType.name}" added`);
                  queryClient.invalidateQueries({ queryKey: ['septic-cert-types', shopId] });
                  setCertForm(p => ({ ...p, certification_type_id: data.id }));
                  setShowAddCertType(false);
                  setNewCertType({ name: '', category: 'certification', requires_renewal: true, default_validity_months: '24', description: '' });
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >Save Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
