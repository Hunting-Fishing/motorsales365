
import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Wrench, Package, Settings, FileText, GripVertical, Edit } from 'lucide-react';
import { jobLineStatusMap } from '@/types/jobLine';
import { JobLineStatusSelector } from './JobLineStatusSelector';
import { SimpleJobLineEditDialog } from './SimpleJobLineEditDialog';
import { DetailFormButton } from './DetailFormButton';
import { generateTempJobLineId } from '@/services/jobLineParserEnhanced';
import { useWorkOrderJobLineOperations } from '@/hooks/useWorkOrderJobLineOperations';
import { QuickAddDropdown } from '../details/QuickAddDropdown';
import { ServiceBasedJobLineForm } from './ServiceBasedJobLineForm';
import { UltimateAddPartDialog } from '../parts/UltimateAddPartDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobLinePartsDisplay } from '../parts/JobLinePartsDisplay';
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
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CompactJobLinesTableProps {
  jobLines: WorkOrderJobLine[];
  allParts?: WorkOrderPart[];
  onUpdate?: ((jobLine: WorkOrderJobLine) => void) | (() => Promise<void>); // Support both patterns
  onDelete?: (jobLineId: string) => void;
  onEdit?: (jobLine: WorkOrderJobLine) => void;
  onAddJobLine?: (jobLine: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>) => void;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
  onReorder?: (reorderedJobLines: WorkOrderJobLine[]) => void;
  workOrderId?: string;
  isEditMode: boolean;
  onRefresh?: () => Promise<void>; // For enhanced operations
  onPartUpdate?: (part: WorkOrderPart) => void;
  onPartDelete?: (partId: string) => void;
}

interface SortableJobLineRowProps {
  jobLine: WorkOrderJobLine;
  isEditMode: boolean;
  onUpdate?: ((jobLine: WorkOrderJobLine) => void) | (() => Promise<void>);
  onDelete?: (jobLineId: string) => void;
  onEdit?: (jobLine: WorkOrderJobLine) => void;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
  getIconForCategory: (category?: string) => React.ReactNode;
  handleEditClick: (jobLine: WorkOrderJobLine) => void;
  handleCompletionToggle: (jobLine: WorkOrderJobLine, completed: boolean) => Promise<void>;
  handleStatusChange: (jobLineId: string, newStatus: any) => Promise<void>;
  allJobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
}

function SortableJobLineRow({
  jobLine,
  isEditMode,
  onUpdate,
  onDelete,
  onAddPart,
  getIconForCategory,
  handleEditClick,
  handleCompletionToggle,
  handleStatusChange,
  allJobLines,
  allParts
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

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'relative z-50' : ''}>
      {/* Drag Handle Column */}
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
      
      {/* Type Column */}
      <TableCell>
        <div className="flex items-center gap-2">
          {getIconForCategory(jobLine.category)}
          <Badge variant="outline" className="text-xs">
            {jobLine.category || 'Labor'}
          </Badge>
        </div>
      </TableCell>
      
      {/* Details Column */}
      {isEditMode && (
        <TableCell>
          <DetailFormButton 
            jobLine={jobLine} 
            onUpdate={(updatedJobLine) => {
              if (onUpdate) {
                if (onUpdate.length === 0) {
                  (onUpdate as () => Promise<void>)();
                } else {
                  (onUpdate as (jobLine: WorkOrderJobLine) => void)(updatedJobLine);
                }
              }
            }}
            onAddPart={onAddPart}
            jobLines={allJobLines}
          />
        </TableCell>
      )}
      
      {/* Name, Description, Hours, Rate, Total, Parts, Status Columns */}
      <TableCell className="font-medium">{jobLine.name}</TableCell>
      <TableCell className="max-w-xs truncate">{jobLine.description}</TableCell>
      <TableCell>{jobLine.estimated_hours || 0}</TableCell>
      <TableCell>${jobLine.labor_rate || 0}</TableCell>
      <TableCell>${jobLine.total_amount || 0}</TableCell>
      
      {/* Parts Column */}
      <TableCell className="max-w-xs">
        <JobLinePartsDisplay
          jobLineId={jobLine.id}
          parts={allParts}
        />
      </TableCell>
      
      <TableCell>
        <JobLineStatusSelector
          jobLine={jobLine}
          onStatusChange={handleStatusChange}
          size="sm"
          showQuickActions={false}
        />
      </TableCell>
      
      {/* Complete Column - Now using status selector for better workflow */}
      {isEditMode && (
        <TableCell>
          <div className="flex items-center justify-center">
            <JobLineStatusSelector
              jobLine={jobLine}
              onStatusChange={handleStatusChange}
              size="sm"
              showQuickActions={true}
            />
          </div>
        </TableCell>
      )}
      
      {/* Actions Column */}
      {isEditMode && (
        <TableCell>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEditClick(jobLine);
              }}
              title="Edit job line"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(jobLine.id);
                }}
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

export function CompactJobLinesTable({
  jobLines,
  allParts = [],
  onUpdate,
  onDelete,
  onEdit,
  onAddJobLine,
  onAddPart,
  onReorder,
  workOrderId,
  isEditMode,
  onRefresh,
  onPartUpdate,
  onPartDelete
}: CompactJobLinesTableProps) {
  const [editingJobLine, setEditingJobLine] = useState<WorkOrderJobLine | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // State for auto-opening forms
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showPartsForm, setShowPartsForm] = useState(false);
  const [showSubletForm, setShowSubletForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Enhanced job line operations for completion toggle
  const jobLineOperations = useWorkOrderJobLineOperations(
    jobLines, 
    onRefresh || (async () => {
      if (onUpdate && typeof onUpdate === 'function' && onUpdate.length === 0) {
        await (onUpdate as () => Promise<void>)();
      }
    })
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleEditClick = (jobLine: WorkOrderJobLine) => {
    if (onEdit) {
      onEdit(jobLine);
    } else {
      setEditingJobLine(jobLine);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveJobLine = async (updatedJobLine: WorkOrderJobLine) => {
    if (onUpdate) {
      // Support both callback patterns
      if (onUpdate.length === 0) {
        // No parameters - refresh function
        await (onUpdate as () => Promise<void>)();
      } else {
        // Has parameters - update function
        (onUpdate as (jobLine: WorkOrderJobLine) => void)(updatedJobLine);
      }
    }
    setIsEditDialogOpen(false);
    setEditingJobLine(null);
  };

  // Handle auto-opening forms based on type selection
  const handleAddItem = (type: 'labor' | 'parts' | 'sublet' | 'note') => {
    if (!workOrderId) return;
    
    switch (type) {
      case 'labor':
        setShowLaborForm(true);
        break;
      case 'parts':
        setShowPartsForm(true);
        break;
      case 'sublet':
        setShowSubletForm(true);
        break;
      case 'note':
        setShowNoteForm(true);
        break;
    }
  };

  // Handle saving job lines from forms
  const handleJobLineSave = (jobLines: WorkOrderJobLine[]) => {
    if (onAddJobLine) {
      jobLines.forEach(jobLine => {
        const { id, created_at, updated_at, ...jobLineData } = jobLine;
        onAddJobLine(jobLineData);
      });
    }
    
    // Close all forms
    setShowLaborForm(false);
    setShowPartsForm(false);
    setShowSubletForm(false);
    setShowNoteForm(false);
  };

  // Handle closing forms
  const handleFormCancel = () => {
    setShowLaborForm(false);
    setShowPartsForm(false);
    setShowSubletForm(false);
    setShowNoteForm(false);
  };

  // Handle parts form save
  const handlePartAdded = async () => {
    if (onAddPart) {
      await onAddPart({} as WorkOrderPartFormValues);
    }
    setShowPartsForm(false);
  };


  const handleCompletionToggle = async (jobLine: WorkOrderJobLine, completed: boolean) => {
    if (!onUpdate) return;

    try {
      const updatedJobLine: WorkOrderJobLine = {
        ...jobLine,
        is_work_completed: completed,
        completion_date: completed ? new Date().toISOString() : undefined,
        completed_by: completed ? 'Current User' : undefined, // In real app, get from auth
        status: completed ? 'completed' : 'pending',
        updated_at: new Date().toISOString()
      };

      if (onUpdate.length === 0) {
        await (onUpdate as () => Promise<void>)();
      } else {
        (onUpdate as (jobLine: WorkOrderJobLine) => void)(updatedJobLine);
      }
    } catch (error) {
      console.error('Error updating completion status:', error);
    }
  };

  const getIconForCategory = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'labor':
        return <Wrench className="h-3 w-3" />;
      case 'parts':
        return <Package className="h-3 w-3" />;
      case 'sublet':
        return <Settings className="h-3 w-3" />;
      case 'note':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      try {
        const oldIndex = jobLines.findIndex((item) => item.id === active.id);
        const newIndex = jobLines.findIndex((item) => item.id === over?.id);
        
        const reorderedJobLines = arrayMove(jobLines, oldIndex, newIndex).map((jobLine, index) => ({
          ...jobLine,
          display_order: index + 1
        }));
        
        // Call the reorder callback if provided
        if (onReorder) {
          await onReorder(reorderedJobLines);
        }
      } catch (error) {
        console.error('Error reordering job lines:', error);
      }
    }
  };

  if (jobLines.length === 0 && !isEditMode) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>No job lines added yet</p>
      </div>
    );
  }

  const totalColumns = isEditMode ? 12 : 9; // Drag + Type + Details + Name + Desc + Hours + Rate + Total + Parts + Status + Complete + Actions

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
              {isEditMode && <TableHead className="w-8"></TableHead>} {/* Drag Handle */}
              <TableHead>Type</TableHead>
              {isEditMode && <TableHead className="w-16">Details</TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Status</TableHead>
              {isEditMode && <TableHead className="w-32">Workflow</TableHead>}
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
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddPart={onAddPart}
                  getIconForCategory={getIconForCategory}
                  handleEditClick={handleEditClick}
                  handleCompletionToggle={jobLineOperations.handleToggleCompletion}
                  handleStatusChange={jobLineOperations.handleStatusChange}
                  allJobLines={jobLines}
                  allParts={allParts}
                />
              ))}
            </SortableContext>
            
            {/* Individual Work Order Level Parts - Show each unassociated part as editable row */}
            {allParts
              .filter(part => !part.job_line_id)
              .map((part) => (
                <TableRow key={`part-${part.id}`} className="bg-blue-50/30 border-l-4 border-l-blue-500">
                  {isEditMode && <TableCell className="w-8"></TableCell>}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                        Part
                      </Badge>
                    </div>
                  </TableCell>
                  {isEditMode && <TableCell></TableCell>}
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {part.part_number && `Part #: ${part.part_number}`}
                  </TableCell>
                  <TableCell>{part.quantity || 1}</TableCell>
                  <TableCell>${(part.unit_price || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      ${((part.customerPrice || part.unit_price || 0) * (part.quantity || 1)).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">No sub-parts</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {part.status || 'Active'}
                    </Badge>
                  </TableCell>
                  {isEditMode && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPartUpdate && onPartUpdate(part)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPartDelete && onPartDelete(part.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {isEditMode && <TableCell></TableCell>}
                </TableRow>
              ))}
            
            
            {/* Add Item Row - Only show when in edit mode and onAddJobLine is provided */}
            {isEditMode && onAddJobLine && (
              <TableRow className="bg-muted/30 hover:bg-muted/50">
                {/* Drag Handle Column (empty for add row) */}
                <TableCell className="w-8"></TableCell>
                
                {/* Type Column with QuickAddDropdown */}
                <TableCell>
                  <QuickAddDropdown onAddItem={handleAddItem} />
                </TableCell>
                
                {/* Details column for add item row */}
                <TableCell className="text-muted-foreground"></TableCell>
                <TableCell className="text-muted-foreground">
                  Click "Add Item" to open comprehensive forms
                </TableCell>
                <TableCell className="text-muted-foreground"></TableCell>
                <TableCell className="text-muted-foreground"></TableCell>
                <TableCell className="text-muted-foreground"></TableCell>
                <TableCell className="text-muted-foreground"></TableCell>
                {/* Parts column for add item row */}
                <TableCell className="text-muted-foreground"></TableCell>
                <TableCell className="text-muted-foreground"></TableCell>
                {/* Complete column for add item row */}
                <TableCell className="text-muted-foreground"></TableCell>
                {/* Actions column for add item row */}
                <TableCell></TableCell>
              </TableRow>
            )}
            
            {/* Show "no items" message only when no job lines and not in edit mode */}
            {jobLines.length === 0 && !isEditMode && (
              <TableRow>
                <TableCell colSpan={totalColumns} className="text-center py-4 text-muted-foreground">
                  No job lines added yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>

      {!onEdit && editingJobLine && (
        <SimpleJobLineEditDialog
          jobLine={editingJobLine}
          workOrderId={editingJobLine.work_order_id}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveJobLine}
        />
      )}

      {/* Labor Form Dialog */}
      {showLaborForm && workOrderId && (
        <Dialog open={showLaborForm} onOpenChange={setShowLaborForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Labor Service</DialogTitle>
            </DialogHeader>
            <ServiceBasedJobLineForm
              workOrderId={workOrderId}
              mode="service"
              onSave={handleJobLineSave}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Parts Form Dialog */}
      {showPartsForm && workOrderId && (
        <UltimateAddPartDialog
          open={showPartsForm}
          onOpenChange={setShowPartsForm}
          workOrderId={workOrderId}
          jobLines={jobLines}
          onPartAdded={handlePartAdded}
        />
      )}

      {/* Sublet Form Dialog */}
      {showSubletForm && workOrderId && (
        <Dialog open={showSubletForm} onOpenChange={setShowSubletForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Subcontractor/Miscellaneous Item</DialogTitle>
            </DialogHeader>
            <ServiceBasedJobLineForm
              workOrderId={workOrderId}
              mode="manual"
              onSave={handleJobLineSave}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Note Form Dialog */}
      {showNoteForm && workOrderId && (
        <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
            </DialogHeader>
            <ServiceBasedJobLineForm
              workOrderId={workOrderId}
              mode="manual"
              onSave={handleJobLineSave}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
