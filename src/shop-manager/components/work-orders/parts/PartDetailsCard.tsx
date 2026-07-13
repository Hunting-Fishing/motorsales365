
import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Package } from 'lucide-react';

interface PartDetailsCardProps {
  part: WorkOrderPart;
  onRemove?: (partId: string) => void;
  onUpdate?: (part: WorkOrderPart) => void;
  isEditMode?: boolean;
}

export function PartDetailsCard({ 
  part, 
  onRemove, 
  onUpdate, 
  isEditMode = false 
}: PartDetailsCardProps) {
  const handleRemove = () => {
    if (onRemove) {
      onRemove(part.id);
    }
  };

  const handleEdit = () => {
    if (onUpdate) {
      onUpdate(part);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">{part.name}</h4>
              <p className="text-xs text-muted-foreground">
                Part #: {part.part_number}
              </p>
              {part.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {part.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <Badge variant="outline" className="text-xs">
              {part.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Quantity</p>
            <p className="font-medium">{part.quantity}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground">Unit Price</p>
            <p className="font-medium">${(part.unit_price || part.customerPrice || 0).toFixed(2)}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium">${(part.total_price || 0).toFixed(2)}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{part.part_type || 'Standard'}</p>
          </div>
        </div>

        {(part.supplierName || part.category) && (
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
            {part.supplierName && (
              <div>
                <p className="text-muted-foreground">Supplier</p>
                <p className="font-medium">{part.supplierName}</p>
              </div>
            )}
            
            {part.category && (
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{part.category}</p>
              </div>
            )}
          </div>
        )}

        {part.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-muted-foreground text-sm">Notes</p>
            <p className="text-sm">{part.notes}</p>
          </div>
        )}

        {isEditMode && (
          <div className="mt-3 pt-3 border-t flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              className="text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
