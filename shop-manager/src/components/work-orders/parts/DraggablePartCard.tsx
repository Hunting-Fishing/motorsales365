
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { WorkOrderPart } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, GripVertical } from 'lucide-react';
import { UnifiedPartEditDialog } from './UnifiedPartEditDialog';

interface DraggablePartCardProps {
  part: WorkOrderPart;
  jobLines?: WorkOrderJobLine[];
  onRemovePart?: (partId: string) => void;
  onEditPart?: (part: WorkOrderPart) => void;
  isEditMode?: boolean;
}

export function DraggablePartCard({
  part,
  jobLines = [],
  onRemovePart,
  onEditPart,
  isEditMode = false
}: DraggablePartCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: part.id,
    data: {
      type: 'part',
      jobLineId: part.job_line_id,
      part,
    },
    disabled: !isEditMode,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

  const handleEditPart = async (updatedPart: WorkOrderPart) => {
    if (onEditPart) {
      onEditPart(updatedPart);
    }
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        className={`transition-all duration-200 ${
          isDragging 
            ? 'opacity-50 shadow-lg scale-105 bg-blue-50 border-blue-300' 
            : 'hover:shadow-md'
        } ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isEditMode && (
                  <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <h4 className="font-medium">{part.name}</h4>
                <Badge variant="outline">{part.part_number}</Badge>
              </div>
              
              {part.description && (
                <p className="text-sm text-muted-foreground mb-2">{part.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <span>Qty: {part.quantity}</span>
                <span>${part.unit_price}</span>
                <span className="font-medium">${part.total_price}</span>
              </div>
              
              {part.status && (
                <Badge variant="secondary" className="mt-2">
                  {part.status}
                </Badge>
              )}
            </div>
            
            {isEditMode && (
              <div className="flex gap-2 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemovePart?.(part.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UnifiedPartEditDialog
        part={part}
        jobLines={jobLines}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleEditPart}
      />
    </>
  );
}
