import React, { useState } from 'react';
import { WorkOrderPart, WorkOrderPartFormValues, partStatusMap } from '@/types/workOrderPart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Package, Plus, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditPartDialog } from './EditPartDialog';
import { AddPartDialog } from './AddPartDialog';
import { StatusBadge } from '../shared/StatusBadge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

interface WorkOrderPartsSectionProps {
  parts: WorkOrderPart[];
  isEditMode: boolean;
  onPartUpdate?: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  onPartDelete?: (partId: string) => void;
  onPartReorder?: (partIds: string[]) => Promise<void>;
  onAdd?: (partData: WorkOrderPartFormValues) => Promise<void>;
  workOrderId?: string;
  isLoading?: boolean;
}

interface SortablePartRowProps {
  part: WorkOrderPart;
  isEditMode: boolean;
  onPartUpdate?: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  onPartDelete?: (partId: string) => void;
}

function SortablePartRow({ part, isEditMode, onPartUpdate, onPartDelete }: SortablePartRowProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: part.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const totalPrice = (part.customerPrice || part.unit_price || 0) * (part.quantity || 1);

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (partId: string, updates: Partial<WorkOrderPart>) => {
    if (!onPartUpdate) return;
    
    try {
      setIsUpdating(true);
      await onPartUpdate(partId, updates);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating part:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (onPartDelete) {
      onPartDelete(part.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <TableRow 
        ref={setNodeRef}
        style={style}
        className={`bg-blue-50/30 border-l-4 border-l-blue-500 ${isDragging ? 'opacity-50' : ''}`}
      >
        {/* Drag Handle */}
        {isEditMode && (
          <TableCell className="w-8">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          </TableCell>
        )}
        
        {/* Type */}
        <TableCell>
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3" />
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
              Part
            </Badge>
          </div>
        </TableCell>
        
        {/* Name */}
        <TableCell className="font-medium">{part.name}</TableCell>
        
        {/* Description/Part Number */}
        <TableCell className="text-muted-foreground text-sm">
          {part.part_number && `Part #: ${part.part_number}`}
        </TableCell>
        
        {/* Quantity */}
        <TableCell>{part.quantity || 1}</TableCell>
        
        {/* Unit Price */}
        <TableCell>${(part.unit_price || 0).toFixed(2)}</TableCell>
        
        {/* Total */}
        <TableCell>
          <span className="font-medium">
            ${totalPrice.toFixed(2)}
          </span>
        </TableCell>
        
        {/* Status */}
        <TableCell>
          <StatusBadge status={part.status || 'pending'} type="part" />
        </TableCell>
        
        {/* Actions */}
        {isEditMode && (
          <TableCell>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 w-7 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              {onPartDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>

      {/* Edit Dialog */}
      <EditPartDialog
        part={part}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleSaveEdit}
        isLoading={isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Part</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{part.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function WorkOrderPartsSection({
  parts,
  isEditMode,
  onPartUpdate,
  onPartDelete,
  onPartReorder,
  onAdd,
  workOrderId,
  isLoading = false
}: WorkOrderPartsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localParts, setLocalParts] = useState<WorkOrderPart[]>([]);

  // Filter for work order level parts (not associated with job lines)
  const workOrderLevelParts = parts.filter(part => !part.job_line_id);

  // Initialize local parts state
  React.useEffect(() => {
    setLocalParts(workOrderLevelParts);
  }, [workOrderLevelParts]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localParts.findIndex((part) => part.id === active.id);
      const newIndex = localParts.findIndex((part) => part.id === over.id);

      const newOrder = arrayMove(localParts, oldIndex, newIndex);
      setLocalParts(newOrder);

      // Call the reorder callback if provided
      if (onPartReorder) {
        try {
          await onPartReorder(newOrder.map(part => part.id));
        } catch (error) {
          console.error('Failed to reorder parts:', error);
          // Revert on error
          setLocalParts(localParts);
        }
      }
    }
  };

  const handlePartAdded = () => {
    // Refresh the parts list - onAdd callback will handle the refresh
    if (onAdd) {
      // The AddPartDialog handles creation via createWorkOrderPart service
      // So we just need to trigger a refresh
    }
    setShowAddForm(false);
  };

  const totalPartsValue = localParts.reduce((sum, part) => {
    return sum + ((part.customerPrice || part.unit_price || 0) * (part.quantity || 1));
  }, 0);

  if (localParts.length === 0 && !isEditMode) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Work Order Level Parts
            {localParts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {localParts.length} parts
              </Badge>
            )}
          </CardTitle>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Part
            </Button>
          )}
        </div>
        {localParts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Total Value: <span className="font-medium">${totalPartsValue.toFixed(2)}</span>
          </p>
        )}
      </CardHeader>
      
      {localParts.length > 0 && (
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isEditMode && <TableHead className="w-8"></TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  {isEditMode && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <SortableContext
                items={localParts.map(part => part.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {localParts.map((part) => (
                    <SortablePartRow
                      key={part.id}
                      part={part}
                      isEditMode={isEditMode}
                      onPartUpdate={onPartUpdate}
                      onPartDelete={onPartDelete}
                    />
                  ))}
                </TableBody>
              </SortableContext>
            </Table>
          </DndContext>
        </CardContent>
      )}

      {localParts.length === 0 && isEditMode && (
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No work order level parts added yet</p>
            <p className="text-sm">Use the "Add Part" button to add parts directly to this work order</p>
          </div>
        </CardContent>
      )}

      {/* Add Part Dialog */}
      {workOrderId && (
        <AddPartDialog
          open={showAddForm}
          onOpenChange={setShowAddForm}
          workOrderId={workOrderId}
          jobLines={[]}
          onPartAdded={handlePartAdded}
        />
      )}
    </Card>
  );
}