import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, Wrench, FileText, GripVertical } from 'lucide-react';
import { jobLineStatusMap } from '@/types/jobLine';
import { DetailFormButton } from './DetailFormButton';
import { JobLinePartsDisplay } from '../parts/JobLinePartsDisplay';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { SimpleJobLineEditDialog } from './SimpleJobLineEditDialog';
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
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface JobLinesTableProps {
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  isEditMode: boolean;
  onUpdate?: (jobLine: WorkOrderJobLine) => void;
  onDelete?: (jobLineId: string) => void;
  onReorder?: (reorderedJobLines: WorkOrderJobLine[]) => void;
  onToggleCompletion?: (jobLine: WorkOrderJobLine, completed: boolean) => Promise<void>;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
}

interface SortableJobLineRowProps {
  jobLine: WorkOrderJobLine;
  isEditMode: boolean;
  allJobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  onUpdate?: (jobLine: WorkOrderJobLine) => void;
  onDelete?: (jobLineId: string) => void;
  onToggleCompletion?: (jobLine: WorkOrderJobLine, completed: boolean) => Promise<void>;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
}

function SortableJobLineRow({
  jobLine,
  isEditMode,
  allJobLines,
  allParts,
  onUpdate,
  onDelete,
  onToggleCompletion,
  onAddPart
}: SortableJobLineRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: jobLine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusInfo = jobLineStatusMap[jobLine.status || 'pending'];

  const getIconForCategory = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'labor':
        return <Wrench className="h-3 w-3" />;
      case 'note':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleEditClick = (jobLine: WorkOrderJobLine) => {
    // This will be handled by the parent component's edit dialog
    if (onUpdate) {
      onUpdate(jobLine);
    }
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'relative z-50' : ''}>
      {/* Drag Handle */}
      {isEditMode && (
        <TableCell className="w-8 p-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
      )}
      
      {/* Type */}
      <TableCell>
        <div className="flex items-center gap-2">
          {getIconForCategory(jobLine.category)}
          <Badge variant="outline" className="text-xs">
            {jobLine.category || 'Labor'}
          </Badge>
        </div>
      </TableCell>
      
      {/* Details */}
      {isEditMode && (
        <TableCell>
          <DetailFormButton 
            jobLine={jobLine} 
            onUpdate={onUpdate}
            onAddPart={onAddPart}
            jobLines={allJobLines}
          />
        </TableCell>
      )}
      
      {/* Name */}
      <TableCell className="font-medium">{jobLine.name}</TableCell>
      
      {/* Description */}
      <TableCell className="max-w-xs truncate">{jobLine.description}</TableCell>
      
      {/* Hours */}
      <TableCell>{jobLine.estimated_hours || 0}</TableCell>
      
      {/* Rate */}
      <TableCell>${jobLine.labor_rate || 0}</TableCell>
      
      {/* Total */}
      <TableCell>${jobLine.total_amount || 0}</TableCell>
      
      {/* Parts */}
      <TableCell className="max-w-xs">
        <JobLinePartsDisplay
          jobLineId={jobLine.id}
          parts={allParts}
        />
      </TableCell>
      
      {/* Status */}
      <TableCell>
        <Badge className={statusInfo.classes}>
          {statusInfo.label}
        </Badge>
      </TableCell>
      
      {/* Complete */}
      {isEditMode && (
        <TableCell>
          <div className="flex items-center justify-center">
            <Checkbox
              checked={jobLine.is_work_completed || false}
              onCheckedChange={async (checked) => {
                if (onToggleCompletion) {
                  await onToggleCompletion(jobLine, checked as boolean);
                }
              }}
              title={jobLine.is_work_completed ? 
                `Completed ${jobLine.completion_date ? new Date(jobLine.completion_date).toLocaleDateString() : ''}` : 
                'Mark as completed'
              }
            />
          </div>
        </TableCell>
      )}
      
      {/* Actions */}
      {isEditMode && (
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(jobLine)}
              title="Edit job line"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(jobLine.id)}
                title="Delete job line"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function JobLinesTable({
  jobLines,
  allParts,
  isEditMode,
  onUpdate,
  onDelete,
  onReorder,
  onToggleCompletion,
  onAddPart
}: JobLinesTableProps) {
  const [editingJobLine, setEditingJobLine] = useState<WorkOrderJobLine | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorder) {
      const oldIndex = jobLines.findIndex((item) => item.id === active.id);
      const newIndex = jobLines.findIndex((item) => item.id === over?.id);
      
      const reorderedJobLines = arrayMove(jobLines, oldIndex, newIndex).map((jobLine, index) => ({
        ...jobLine,
        display_order: index + 1
      }));
      
      await onReorder(reorderedJobLines);
    }
  };

  const handleEditJobLine = (jobLine: WorkOrderJobLine) => {
    setEditingJobLine(jobLine);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedJobLine: WorkOrderJobLine) => {
    if (onUpdate) {
      await onUpdate(updatedJobLine);
    }
    setEditingJobLine(null);
    setIsEditDialogOpen(false);
  };

  if (jobLines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No job lines added yet</p>
      </div>
    );
  }

  return (
    <>
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
            {isEditMode && <TableHead className="w-16">Details</TableHead>}
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Parts</TableHead>
            <TableHead>Status</TableHead>
            {isEditMode && <TableHead className="w-20">Complete</TableHead>}
            {isEditMode && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext items={jobLines.map(jl => jl.id)} strategy={verticalListSortingStrategy}>
            {jobLines.map((jobLine) => (
              <SortableJobLineRow
                key={jobLine.id}
                jobLine={jobLine}
                isEditMode={isEditMode}
                allJobLines={jobLines}
                allParts={allParts}
                onUpdate={handleEditJobLine}
                onDelete={onDelete}
                onToggleCompletion={onToggleCompletion}
                onAddPart={onAddPart}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>

    {/* Edit Dialog */}
    {editingJobLine && (
      <SimpleJobLineEditDialog
        jobLine={editingJobLine}
        workOrderId={editingJobLine.work_order_id}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    )}
    </>
  );
}