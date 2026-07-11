
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InventoryItemExtended } from '@/types/inventory';
import { useInventoryCrud } from '@/hooks/inventory/useInventoryCrud';
import { toast } from 'sonner';
import { InventoryForm } from './form/InventoryForm';

export interface EditInventoryDialogProps {
  item: InventoryItemExtended | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated?: () => void;
}

export function EditInventoryDialog({
  item,
  open,
  onOpenChange,
  onItemUpdated,
}: EditInventoryDialogProps) {
  const { updateItem, isLoading } = useInventoryCrud();

  const handleSubmit = async (formData: Partial<InventoryItemExtended>) => {
    if (!item?.id) return;
    
    try {
      // Save changes to the inventory item
      await updateItem(item.id, formData);
      
      toast.success('Inventory item updated successfully');
      onOpenChange(false);
      
      // Refresh the inventory data
      if (onItemUpdated) {
        onItemUpdated();
      }
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      toast.error('Failed to update inventory item');
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Inventory Item</DialogTitle>
        </DialogHeader>
        
        <InventoryForm
          item={item}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
