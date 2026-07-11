
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { WorkOrder, WorkOrderInventoryItem, WorkOrderTemplate } from '@/types/workOrder';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  onSave: (template: Partial<WorkOrderTemplate>) => Promise<void>;
}

export function SaveAsTemplateDialog({ open, onClose, workOrder, onSave }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    
    try {
      // Create template from work order
      const template: Partial<WorkOrderTemplate> = {
        name,
        description,
        status: workOrder.status,
        priority: workOrder.priority,
        technician: workOrder.technician || '',
        notes: workOrder.notes || '',
        location: workOrder.location || '',
        inventory_items: workOrder.inventory_items || []
      };
      
      await onSave(template);
      handleClose();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basic Oil Change Service"
            />
          </div>
          
          <div>
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template"
              rows={3}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            This will save the current work order's status, priority, assigned technician, location, notes and inventory items as a template.
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
