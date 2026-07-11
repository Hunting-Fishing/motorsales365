
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { deleteWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { PartsFormValidator } from '@/utils/partsErrorHandler';

interface DeletePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: WorkOrderPart;
  onPartDeleted: () => Promise<void>;
}

export function DeletePartDialog({
  open,
  onOpenChange,
  part,
  onPartDeleted
}: DeletePartDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteWorkOrderPart(part.id);
      
      PartsFormValidator.showSuccessToast('Part deleted successfully');
      await onPartDeleted();
      
    } catch (error) {
      console.error('Error deleting part:', error);
      const errorMessage = PartsFormValidator.handleApiError(error);
      setDeleteError(errorMessage);
      PartsFormValidator.showErrorToast(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Part</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this part? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-900">
              Part: {part.name}
            </div>
            <div className="text-sm text-gray-600">
              Part Number: {part.part_number}
            </div>
            <div className="text-sm text-gray-600">
              Quantity: {part.quantity} × ${part.unit_price} = ${part.total_price}
            </div>
          </div>

          {deleteError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Part'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
