
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkOrderPart } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { StatusSelector } from '../shared/StatusSelector';
import { EditService } from '@/services/workOrder/editService';
import { toast } from '@/hooks/use-toast';

interface UnifiedPartEditDialogProps {
  part: WorkOrderPart | null;
  jobLines?: WorkOrderJobLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (part: WorkOrderPart) => Promise<void>;
}

export function UnifiedPartEditDialog({
  part,
  jobLines = [],
  open,
  onOpenChange,
  onSave
}: UnifiedPartEditDialogProps) {
  const [formData, setFormData] = useState<Partial<WorkOrderPart>>({
    name: '',
    part_number: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    status: 'pending',
    notes: '',
    job_line_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (part) {
      setFormData({
        name: part.name || '',
        part_number: part.part_number || '',
        description: part.description || '',
        quantity: part.quantity || 1,
        unit_price: part.unit_price || 0,
        total_price: part.total_price || 0,
        status: part.status || 'pending',
        notes: part.notes || '',
        job_line_id: part.job_line_id || ''
      });
    }
  }, [part]);

  const calculateTotal = () => {
    const quantity = formData.quantity || 1;
    const unitPrice = formData.unit_price || 0;
    return quantity * unitPrice;
  };

  const handleSave = async () => {
    if (!part) return;

    setIsLoading(true);
    try {
      const calculatedTotal = calculateTotal();
      const updatedPart = await EditService.updatePart(part.id, {
        ...formData,
        total_price: calculatedTotal,
        job_line_id: formData.job_line_id === 'none' ? null : formData.job_line_id
      });
      
      await onSave(updatedPart);
      toast({
        title: "Success",
        description: "Part updated successfully",
      });
    } catch (error) {
      console.error('Error saving part:', error);
      toast({
        title: "Error",
        description: "Failed to update part",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof WorkOrderPart, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Part</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Part Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="part_number">Part Number</Label>
            <Input
              id="part_number"
              value={formData.part_number || ''}
              onChange={(e) => handleFieldChange('part_number', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <StatusSelector
              currentStatus={formData.status || 'pending'}
              type="part"
              onStatusChange={(status) => handleFieldChange('status', status)}
            />
          </div>

          {jobLines.length > 0 && (
            <div>
              <Label htmlFor="job_line">Assign to Job Line</Label>
              <Select 
                value={formData.job_line_id || ''} 
                onValueChange={(value) => handleFieldChange('job_line_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  {jobLines.map((jobLine) => (
                    <SelectItem key={jobLine.id} value={jobLine.id}>
                      {jobLine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity || 1}
                onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="unit_price">Unit Price ($)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price || 0}
                onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="total_price">Total Price ($)</Label>
            <Input
              id="total_price"
              type="number"
              step="0.01"
              value={calculateTotal()}
              readOnly
              className="bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
