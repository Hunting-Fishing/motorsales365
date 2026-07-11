import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Edit, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface PartHistory {
  id: string;
  equipment_id: string;
  part_number: string;
  part_name: string;
  replacement_date: string;
  next_replacement_date: string | null;
  replacement_interval_days: number | null;
  replacement_interval_hours: number | null;
  replacement_interval_mileage: number | null;
  hours_at_replacement: number | null;
  mileage_at_replacement: number | null;
  cost: number | null;
  warranty_expiry_date: string | null;
  warranty_months: number | null;
  supplier_name: string | null;
  invoice_number: string | null;
  installed_by: string | null;
  notes: string | null;
}

interface EquipmentPartsHistoryProps {
  equipmentId?: string;
}

export function EquipmentPartsHistory({ equipmentId }: EquipmentPartsHistoryProps) {
  const [partsHistory, setPartsHistory] = useState<PartHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartHistory | null>(null);
  const [formData, setFormData] = useState({
    part_number: '',
    part_name: '',
    replacement_date: format(new Date(), 'yyyy-MM-dd'),
    next_replacement_date: '',
    replacement_interval_days: '',
    replacement_interval_hours: '',
    replacement_interval_mileage: '',
    hours_at_replacement: '',
    mileage_at_replacement: '',
    cost: '',
    warranty_expiry_date: '',
    warranty_months: '',
    supplier_name: '',
    invoice_number: '',
    installed_by: '',
    notes: ''
  });

  useEffect(() => {
    fetchPartsHistory();
  }, [equipmentId]);

  const fetchPartsHistory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('equipment_parts_history' as any)
        .select('*')
        .order('replacement_date', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPartsHistory(data as any || []);
    } catch (error) {
      console.error('Error fetching parts history:', error);
      toast.error('Failed to load parts history');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.part_number || !formData.part_name || !equipmentId) {
        toast.error('Part number, part name, and equipment are required');
        return;
      }

      const dataToSave = {
        equipment_id: equipmentId,
        part_number: formData.part_number,
        part_name: formData.part_name,
        replacement_date: formData.replacement_date,
        next_replacement_date: formData.next_replacement_date || null,
        replacement_interval_days: formData.replacement_interval_days ? parseInt(formData.replacement_interval_days) : null,
        replacement_interval_hours: formData.replacement_interval_hours ? parseInt(formData.replacement_interval_hours) : null,
        replacement_interval_mileage: formData.replacement_interval_mileage ? parseInt(formData.replacement_interval_mileage) : null,
        hours_at_replacement: formData.hours_at_replacement ? parseFloat(formData.hours_at_replacement) : null,
        mileage_at_replacement: formData.mileage_at_replacement ? parseFloat(formData.mileage_at_replacement) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        warranty_expiry_date: formData.warranty_expiry_date || null,
        warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
        supplier_name: formData.supplier_name || null,
        invoice_number: formData.invoice_number || null,
        installed_by: formData.installed_by || null,
        notes: formData.notes || null
      };

      if (editingPart) {
        const { error } = await supabase
          .from('equipment_parts_history' as any)
          .update(dataToSave)
          .eq('id', editingPart.id);

        if (error) throw error;
        toast.success('Part history updated successfully');
      } else {
        const { error } = await supabase
          .from('equipment_parts_history' as any)
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Part history added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchPartsHistory();
    } catch (error) {
      console.error('Error saving part history:', error);
      toast.error('Failed to save part history');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this part history record?')) return;

    try {
      const { error } = await supabase
        .from('equipment_parts_history' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Part history deleted successfully');
      fetchPartsHistory();
    } catch (error) {
      console.error('Error deleting part history:', error);
      toast.error('Failed to delete part history');
    }
  };

  const handleEdit = (part: PartHistory) => {
    setEditingPart(part);
    setFormData({
      part_number: part.part_number,
      part_name: part.part_name,
      replacement_date: part.replacement_date,
      next_replacement_date: part.next_replacement_date || '',
      replacement_interval_days: part.replacement_interval_days?.toString() || '',
      replacement_interval_hours: part.replacement_interval_hours?.toString() || '',
      replacement_interval_mileage: part.replacement_interval_mileage?.toString() || '',
      hours_at_replacement: part.hours_at_replacement?.toString() || '',
      mileage_at_replacement: part.mileage_at_replacement?.toString() || '',
      cost: part.cost?.toString() || '',
      warranty_expiry_date: part.warranty_expiry_date || '',
      warranty_months: part.warranty_months?.toString() || '',
      supplier_name: part.supplier_name || '',
      invoice_number: part.invoice_number || '',
      installed_by: part.installed_by || '',
      notes: part.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPart(null);
    setFormData({
      part_number: '',
      part_name: '',
      replacement_date: format(new Date(), 'yyyy-MM-dd'),
      next_replacement_date: '',
      replacement_interval_days: '',
      replacement_interval_hours: '',
      replacement_interval_mileage: '',
      hours_at_replacement: '',
      mileage_at_replacement: '',
      cost: '',
      warranty_expiry_date: '',
      warranty_months: '',
      supplier_name: '',
      invoice_number: '',
      installed_by: '',
      notes: ''
    });
  };

  const filteredParts = partsHistory.filter(part =>
    part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWarrantyStatus = (warrantyExpiry: string | null) => {
    if (!warrantyExpiry) return null;
    const expiry = new Date(warrantyExpiry);
    const today = new Date();
    const isActive = expiry > today;
    return (
      <Badge variant={isActive ? "default" : "destructive"}>
        {isActive ? 'Active' : 'Expired'}
      </Badge>
    );
  };

  if (!equipmentId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Select an equipment to view parts history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Parts Replacement History
          </CardTitle>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part Record
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by part number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No parts history found. Add your first part replacement record.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Replacement Date</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.part_number}</TableCell>
                      <TableCell>{part.part_name}</TableCell>
                      <TableCell>{format(new Date(part.replacement_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {part.next_replacement_date 
                          ? format(new Date(part.next_replacement_date), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {part.replacement_interval_days && `${part.replacement_interval_days}d`}
                        {part.replacement_interval_hours && ` / ${part.replacement_interval_hours}h`}
                        {part.replacement_interval_mileage && ` / ${part.replacement_interval_mileage}mi`}
                        {!part.replacement_interval_days && !part.replacement_interval_hours && !part.replacement_interval_mileage && '-'}
                      </TableCell>
                      <TableCell>{part.cost ? `$${part.cost.toFixed(2)}` : '-'}</TableCell>
                      <TableCell>{getWarrantyStatus(part.warranty_expiry_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(part)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(part.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Edit' : 'Add'} Part Replacement Record</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="part_number">Part Number *</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="Enter part number"
                />
              </div>
              <div>
                <Label htmlFor="part_name">Part Name *</Label>
                <Input
                  id="part_name"
                  value={formData.part_name}
                  onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                  placeholder="Enter part name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="replacement_date">Replacement Date *</Label>
                <Input
                  id="replacement_date"
                  type="date"
                  value={formData.replacement_date}
                  onChange={(e) => setFormData({ ...formData, replacement_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="next_replacement_date">Next Replacement Date</Label>
                <Input
                  id="next_replacement_date"
                  type="date"
                  value={formData.next_replacement_date}
                  onChange={(e) => setFormData({ ...formData, next_replacement_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="interval_days">Interval (Days)</Label>
                <Input
                  id="interval_days"
                  type="number"
                  value={formData.replacement_interval_days}
                  onChange={(e) => setFormData({ ...formData, replacement_interval_days: e.target.value })}
                  placeholder="90"
                />
              </div>
              <div>
                <Label htmlFor="interval_hours">Interval (Hours)</Label>
                <Input
                  id="interval_hours"
                  type="number"
                  value={formData.replacement_interval_hours}
                  onChange={(e) => setFormData({ ...formData, replacement_interval_hours: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="interval_mileage">Interval (Miles)</Label>
                <Input
                  id="interval_mileage"
                  type="number"
                  value={formData.replacement_interval_mileage}
                  onChange={(e) => setFormData({ ...formData, replacement_interval_mileage: e.target.value })}
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours_at_replacement">Hours at Replacement</Label>
                <Input
                  id="hours_at_replacement"
                  type="number"
                  value={formData.hours_at_replacement}
                  onChange={(e) => setFormData({ ...formData, hours_at_replacement: e.target.value })}
                  placeholder="1250"
                />
              </div>
              <div>
                <Label htmlFor="mileage_at_replacement">Mileage at Replacement</Label>
                <Input
                  id="mileage_at_replacement"
                  type="number"
                  value={formData.mileage_at_replacement}
                  onChange={(e) => setFormData({ ...formData, mileage_at_replacement: e.target.value })}
                  placeholder="45000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="125.50"
                />
              </div>
              <div>
                <Label htmlFor="warranty_months">Warranty (Months)</Label>
                <Input
                  id="warranty_months"
                  type="number"
                  value={formData.warranty_months}
                  onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="warranty_expiry">Warranty Expiry Date</Label>
              <Input
                id="warranty_expiry"
                type="date"
                value={formData.warranty_expiry_date}
                onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Enter supplier"
                />
              </div>
              <div>
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="INV-12345"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="installed_by">Installed By</Label>
              <Input
                id="installed_by"
                value={formData.installed_by}
                onChange={(e) => setFormData({ ...formData, installed_by: e.target.value })}
                placeholder="Technician name"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPart ? 'Update' : 'Add'} Part Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
