import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PartRequest {
  part_number: string;
  part_name: string;
  quantity: number;
  estimated_cost?: number;
  notes?: string;
}

interface PartsRequestManagerProps {
  maintenanceRequestId: string;
  parts: PartRequest[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export function PartsRequestManager({ maintenanceRequestId, parts, onUpdate, readOnly = false }: PartsRequestManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<PartRequest>({
    part_number: '',
    part_name: '',
    quantity: 1,
    estimated_cost: 0,
    notes: ''
  });

  const handleSave = async () => {
    try {
      if (!formData.part_number || !formData.part_name || formData.quantity < 1) {
        toast.error('Part number, name, and quantity are required');
        return;
      }

      let updatedParts = [...parts];
      
      if (editingIndex !== null) {
        updatedParts[editingIndex] = formData;
      } else {
        updatedParts.push(formData);
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update({ parts_requested: updatedParts as any })
        .eq('id', maintenanceRequestId);

      if (error) throw error;

      toast.success(editingIndex !== null ? 'Part updated' : 'Part added');
      setDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error('Failed to save part');
    }
  };

  const handleDelete = async (index: number) => {
    try {
      const updatedParts = parts.filter((_, i) => i !== index);

      const { error } = await supabase
        .from('maintenance_requests')
        .update({ parts_requested: updatedParts as any })
        .eq('id', maintenanceRequestId);

      if (error) throw error;

      toast.success('Part removed');
      onUpdate();
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(parts[index]);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIndex(null);
    setFormData({
      part_number: '',
      part_name: '',
      quantity: 1,
      estimated_cost: 0,
      notes: ''
    });
  };

  const totalEstimatedCost = parts.reduce((sum, part) => 
    sum + (part.estimated_cost || 0) * part.quantity, 0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Parts Requested
        </CardTitle>
        {!readOnly && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {parts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No parts requested yet. Click "Add Part" to start.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Notes</TableHead>
                    {!readOnly && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{part.part_number}</TableCell>
                      <TableCell>{part.part_name}</TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell>${(part.estimated_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        ${((part.estimated_cost || 0) * part.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{part.notes || '-'}</TableCell>
                      {!readOnly && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="text-lg font-semibold">
                Total Estimated Cost: ${totalEstimatedCost.toFixed(2)}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit' : 'Add'} Part Request</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="estimated_cost">Est. Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
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

            <div className="text-sm text-muted-foreground">
              Total: ${((formData.estimated_cost || 0) * formData.quantity).toFixed(2)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? 'Update' : 'Add'} Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
