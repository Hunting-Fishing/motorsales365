import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { EnhancedPartRow } from './EnhancedPartRow';
import { deleteWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { toast } from 'sonner';

interface PartsTableProps {
  parts: WorkOrderPart[];
  onPartUpdate?: (updatedPart: WorkOrderPart) => Promise<void>;
  onPartDelete?: (partId: string) => Promise<void>;
  isEditMode?: boolean;
}

export function PartsTable({
  parts,
  onPartUpdate,
  onPartDelete,
  isEditMode = false
}: PartsTableProps) {
  const handleEditPart = (updatedPart: WorkOrderPart) => {
    if (onPartUpdate) {
      onPartUpdate(updatedPart);
    }
  };

  const handleDeletePart = async (partId: string) => {
    try {
      console.log('Deleting part:', partId);
      
      await deleteWorkOrderPart(partId);
      
      toast.success('Part deleted successfully');
      
      if (onPartDelete) {
        await onPartDelete(partId);
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Part
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Price
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignment
            </th>
            {isEditMode && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {parts.map((part) => (
            <EnhancedPartRow
              key={part.id}
              part={part}
              onEdit={handleEditPart}
              onDelete={handleDeletePart}
              isEditMode={isEditMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
