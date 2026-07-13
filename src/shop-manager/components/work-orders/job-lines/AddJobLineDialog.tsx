import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkOrderJobLine } from '@/types/jobLine';
import { ServiceBasedJobLineForm } from './ServiceBasedJobLineForm';
export interface AddJobLineDialogProps {
  workOrderId: string;
  onJobLineAdd: (jobLines: WorkOrderJobLine[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function AddJobLineDialog({
  workOrderId,
  onJobLineAdd,
  open,
  onOpenChange
}: AddJobLineDialogProps) {
  const [mode, setMode] = useState<'selection' | 'service' | 'manual'>('selection');
  const handleJobLineSave = (jobLines: WorkOrderJobLine[]) => {
    onJobLineAdd(jobLines);
    onOpenChange(false);
    setMode('selection'); // Reset to selection mode
  };
  const handleCancel = () => {
    onOpenChange(false);
    setMode('selection'); // Reset to selection mode
  };
  const handleBackToSelection = () => {
    setMode('selection');
  };
  if (mode === 'service' || mode === 'manual') {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToSelection} className="p-2">
                ← Back
              </Button>
              <DialogTitle>
                {mode === 'service' ? 'Add Job Line from Service' : 'Add Manual Job Line'}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <ServiceBasedJobLineForm workOrderId={workOrderId} onSave={handleJobLineSave} onCancel={handleCancel} mode={mode} />
        </DialogContent>
      </Dialog>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-50">
        <DialogHeader>
          <DialogTitle>Add Job Line</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to add job lines to this work order:
          </p>
          
          <div className="grid gap-3">
            <Button onClick={() => setMode('service')} className="justify-start h-auto p-4" variant="outline">
              <div className="text-left">
                <div className="font-medium">From Service Catalog</div>
                <div className="text-sm text-muted-foreground">
                  Select pre-configured services with pricing
                </div>
              </div>
            </Button>
            
            <Button onClick={() => setMode('manual')} className="justify-start h-auto p-4" variant="outline">
              <div className="text-left">
                <div className="font-medium">Manual Entry</div>
                <div className="text-sm text-muted-foreground">
                  Create a custom job line manually
                </div>
              </div>
            </Button>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}