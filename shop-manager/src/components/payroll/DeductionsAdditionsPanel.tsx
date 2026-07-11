import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus, PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

interface Deduction {
  id: string;
  employee_id: string;
  employee_name?: string;
  deduction_type: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  is_percentage: boolean;
  is_pretax: boolean;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
}

interface Addition {
  id: string;
  employee_id: string;
  employee_name?: string;
  addition_type: string;
  name: string;
  amount: number;
  is_recurring: boolean;
  is_taxable: boolean;
  effective_from: string;
  effective_until: string | null;
}

const DEDUCTION_TYPES = [
  { value: 'tax', label: 'Tax' },
  { value: 'benefits', label: 'Benefits' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'garnishment', label: 'Garnishment' },
  { value: 'other', label: 'Other' },
];

const ADDITION_TYPES = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'other', label: 'Other' },
];

export function DeductionsAdditionsPanel() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'deduction' | 'addition'>('deduction');
  const [editingItem, setEditingItem] = useState<Deduction | Addition | null>(null);
  const { shopId } = useShopId();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    type: '',
    name: '',
    amount: '',
    percentage: '',
    is_percentage: false,
    is_pretax: true,
    is_recurring: false,
    is_taxable: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
  });

  useEffect(() => {
    if (shopId) {
      fetchData();
    }
  }, [shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('shop_id', shopId);

      if (employeesData) {
        setEmployees(employeesData.map(e => ({
          id: e.id,
          name: e.first_name && e.last_name 
            ? `${e.first_name} ${e.last_name}` 
            : e.email || 'Unknown'
        })));
      }

      // Fetch deductions using any cast for new table
      const { data: deductionsData } = await (supabase
        .from('payroll_deductions' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false }) as any);

      if (deductionsData) {
        const enriched = deductionsData.map((d: any) => ({
          ...d,
          employee_name: employeesData?.find(e => e.id === d.employee_id)?.first_name || 'Unknown'
        }));
        setDeductions(enriched);
      }

      // Fetch additions using any cast for new table
      const { data: additionsData } = await (supabase
        .from('payroll_additions' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false }) as any);

      if (additionsData) {
        const enriched = additionsData.map((a: any) => ({
          ...a,
          employee_name: employeesData?.find(e => e.id === a.employee_id)?.first_name || 'Unknown'
        }));
        setAdditions(enriched);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: 'deduction' | 'addition', item?: Deduction | Addition) => {
    setDialogType(type);
    setEditingItem(item || null);
    
    if (item) {
      setFormData({
        employee_id: item.employee_id,
        type: type === 'deduction' ? (item as Deduction).deduction_type : (item as Addition).addition_type,
        name: item.name,
        amount: item.amount?.toString() || '',
        percentage: type === 'deduction' ? ((item as Deduction).percentage?.toString() || '') : '',
        is_percentage: type === 'deduction' ? (item as Deduction).is_percentage : false,
        is_pretax: type === 'deduction' ? (item as Deduction).is_pretax : true,
        is_recurring: type === 'addition' ? (item as Addition).is_recurring : false,
        is_taxable: type === 'addition' ? (item as Addition).is_taxable : true,
        effective_from: item.effective_from,
        effective_until: item.effective_until || '',
      });
    } else {
      setFormData({
        employee_id: '',
        type: '',
        name: '',
        amount: '',
        percentage: '',
        is_percentage: false,
        is_pretax: true,
        is_recurring: false,
        is_taxable: true,
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!shopId || !formData.employee_id || !formData.type || !formData.name) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      if (dialogType === 'deduction') {
        const deductionData = {
          shop_id: shopId,
          employee_id: formData.employee_id,
          deduction_type: formData.type,
          name: formData.name,
          amount: formData.is_percentage ? null : parseFloat(formData.amount) || null,
          percentage: formData.is_percentage ? parseFloat(formData.percentage) / 100 || null : null,
          is_percentage: formData.is_percentage,
          is_pretax: formData.is_pretax,
          is_active: true,
          effective_from: formData.effective_from,
          effective_until: formData.effective_until || null,
        };

        if (editingItem) {
          await (supabase.from('payroll_deductions' as any).update(deductionData).eq('id', editingItem.id) as any);
        } else {
          await (supabase.from('payroll_deductions' as any).insert(deductionData) as any);
        }
      } else {
        const additionData = {
          shop_id: shopId,
          employee_id: formData.employee_id,
          addition_type: formData.type,
          name: formData.name,
          amount: parseFloat(formData.amount) || 0,
          is_recurring: formData.is_recurring,
          is_taxable: formData.is_taxable,
          effective_from: formData.effective_from,
          effective_until: formData.effective_until || null,
        };

        if (editingItem) {
          await (supabase.from('payroll_additions' as any).update(additionData).eq('id', editingItem.id) as any);
        } else {
          await (supabase.from('payroll_additions' as any).insert(additionData) as any);
        }
      }

      toast({ title: 'Success', description: `${dialogType === 'deduction' ? 'Deduction' : 'Addition'} saved successfully` });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDelete = async (type: 'deduction' | 'addition', id: string) => {
    try {
      const table = type === 'deduction' ? 'payroll_deductions' : 'payroll_additions';
      await (supabase.from(table as any).delete().eq('id', id) as any);
      toast({ title: 'Deleted', description: `${type === 'deduction' ? 'Deduction' : 'Addition'} deleted` });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await (supabase.from('payroll_deductions' as any).update({ is_active: !currentStatus }).eq('id', id) as any);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minus className="h-5 w-5 text-destructive" />
          <Plus className="h-5 w-5 text-green-500" />
          Deductions & Additions
        </CardTitle>
        <CardDescription>Manage recurring deductions and one-time additions for employees</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deductions">
          <TabsList className="mb-4">
            <TabsTrigger value="deductions">Deductions ({deductions.length})</TabsTrigger>
            <TabsTrigger value="additions">Additions ({additions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="deductions">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openDialog('deduction')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Deduction
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Pre-Tax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{employees.find(e => e.id === d.employee_id)?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DEDUCTION_TYPES.find(t => t.value === d.deduction_type)?.label}</Badge>
                    </TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>
                      {d.is_percentage 
                        ? `${((d.percentage || 0) * 100).toFixed(2)}%`
                        : `$${(d.amount || 0).toFixed(2)}`}
                    </TableCell>
                    <TableCell>{d.is_pretax ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d.id, d.is_active)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDialog('deduction', d)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete('deduction', d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {deductions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No deductions configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="additions">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openDialog('addition')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Addition
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Taxable</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {additions.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{employees.find(e => e.id === a.employee_id)?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ADDITION_TYPES.find(t => t.value === a.addition_type)?.label}</Badge>
                    </TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>${a.amount.toFixed(2)}</TableCell>
                    <TableCell>{a.is_recurring ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{a.is_taxable ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDialog('addition', a)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete('addition', a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {additions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No additions configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit' : 'Add'} {dialogType === 'deduction' ? 'Deduction' : 'Addition'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={formData.employee_id} onValueChange={v => setFormData({ ...formData, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {(dialogType === 'deduction' ? DEDUCTION_TYPES : ADDITION_TYPES).map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Health Insurance, Performance Bonus"
                />
              </div>
              {dialogType === 'deduction' && (
                <div className="flex items-center gap-4">
                  <Label>Use Percentage</Label>
                  <Switch 
                    checked={formData.is_percentage} 
                    onCheckedChange={v => setFormData({ ...formData, is_percentage: v })} 
                  />
                </div>
              )}
              {dialogType === 'deduction' && formData.is_percentage ? (
                <div>
                  <Label>Percentage (%)</Label>
                  <Input 
                    type="number" 
                    value={formData.percentage} 
                    onChange={e => setFormData({ ...formData, percentage: e.target.value })}
                    placeholder="e.g., 6.2"
                  />
                </div>
              ) : (
                <div>
                  <Label>Amount ($)</Label>
                  <Input 
                    type="number" 
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., 150.00"
                  />
                </div>
              )}
              {dialogType === 'deduction' && (
                <div className="flex items-center gap-4">
                  <Label>Pre-Tax Deduction</Label>
                  <Switch 
                    checked={formData.is_pretax} 
                    onCheckedChange={v => setFormData({ ...formData, is_pretax: v })} 
                  />
                </div>
              )}
              {dialogType === 'addition' && (
                <>
                  <div className="flex items-center gap-4">
                    <Label>Recurring</Label>
                    <Switch 
                      checked={formData.is_recurring} 
                      onCheckedChange={v => setFormData({ ...formData, is_recurring: v })} 
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label>Taxable</Label>
                    <Switch 
                      checked={formData.is_taxable} 
                      onCheckedChange={v => setFormData({ ...formData, is_taxable: v })} 
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective From</Label>
                  <Input 
                    type="date" 
                    value={formData.effective_from} 
                    onChange={e => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Effective Until (optional)</Label>
                  <Input 
                    type="date" 
                    value={formData.effective_until} 
                    onChange={e => setFormData({ ...formData, effective_until: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>
                {editingItem ? 'Update' : 'Create'} {dialogType === 'deduction' ? 'Deduction' : 'Addition'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
