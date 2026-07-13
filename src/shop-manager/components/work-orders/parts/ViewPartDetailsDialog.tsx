
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Separator } from '@/components/ui/separator';

interface ViewPartDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: WorkOrderPart | null;
}

export function ViewPartDetailsDialog({ 
  open, 
  onOpenChange, 
  part 
}: ViewPartDetailsDialogProps) {
  if (!part) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Part Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Part Name</label>
                <p className="text-sm">{part.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Part Number</label>
                <p className="text-sm font-mono">{part.part_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <Badge variant="outline">{part.part_type || 'Standard'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <Badge>{part.status}</Badge>
              </div>
            </div>
            
            {part.description && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm mt-1">{part.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing Information */}
          <div>
            <h3 className="font-semibold mb-3">Pricing & Quantity</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Quantity</label>
                <p className="text-sm font-medium">{part.quantity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Unit Price</label>
                <p className="text-sm font-medium">${(part.unit_price || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total Price</label>
                <p className="text-sm font-medium">${part.total_price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(part.supplierName || part.supplierCost || part.category) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {part.supplierName && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Supplier</label>
                      <p className="text-sm">{part.supplierName}</p>
                    </div>
                  )}
                  {part.supplierCost && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Supplier Cost</label>
                      <p className="text-sm">${part.supplierCost.toFixed(2)}</p>
                    </div>
                  )}
                  {part.category && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p className="text-sm">{part.category}</p>
                    </div>
                  )}
                  {part.warrantyDuration && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Warranty</label>
                      <p className="text-sm">{part.warrantyDuration}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {part.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Notes</h3>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{part.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
