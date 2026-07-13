
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormRenderer } from './FormRenderer';
import { FormBuilderTemplate } from '@/types/formBuilder';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  template: FormBuilderTemplate | null;
  customerId?: string;
  vehicleId?: string;
  workOrderId?: string;
  onSubmitSuccess?: () => void;
}

export function FormDialog({
  open,
  onClose,
  template,
  customerId,
  vehicleId,
  workOrderId,
  onSubmitSuccess
}: FormDialogProps) {
  if (!template) return null;

  const handleSubmit = (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    onSubmitSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{template.name}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-4">
          <FormRenderer
            templateId={template.id}
            onSubmit={handleSubmit}
            customerId={customerId}
            vehicleId={vehicleId}
            workOrderId={workOrderId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
