
import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { partStatusMap } from '@/types/workOrderPart';

interface EnhancedPartRowProps {
  part: WorkOrderPart;
  onEdit?: (part: WorkOrderPart) => void;
  onDelete?: (partId: string) => void;
  isEditMode?: boolean;
}

export function EnhancedPartRow({ part, onEdit, onDelete, isEditMode }: EnhancedPartRowProps) {
  const handleEdit = () => {
    if (onEdit) {
      onEdit(part);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(part.id);
    }
  };

  const statusInfo = partStatusMap[part.status] || { label: part.status, classes: 'bg-gray-100 text-gray-800' };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-sm">{part.name}</div>
          <div className="text-xs text-gray-500">#{part.part_number}</div>
          {part.description && (
            <div className="text-xs text-gray-500 mt-1">{part.description}</div>
          )}
        </div>
      </td>
      
      <td className="px-4 py-3 text-sm text-center">{part.quantity}</td>
      
      <td className="px-4 py-3 text-sm text-right">
        ${(part.unit_price || part.customerPrice || 0).toFixed(2)}
      </td>
      
      <td className="px-4 py-3 text-sm font-medium text-right">
        ${(part.total_price || 0).toFixed(2)}
      </td>
      
      <td className="px-4 py-3">
        <Badge className={`${statusInfo.classes} text-xs`}>
          {statusInfo.label}
        </Badge>
      </td>
      
      <td className="px-4 py-3 text-sm">
        <span className="capitalize">{part.part_type || 'Standard'}</span>
      </td>
      
      <td className="px-4 py-3 text-sm">
        {part.supplierName || '-'}
      </td>
      
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">
            {part.job_line_id ? 'Assigned' : 'Unassigned'}
          </span>
        </div>
      </td>
      
      {isEditMode && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-7 w-7 p-0"
              title="Edit part"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              title="Delete part"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}
