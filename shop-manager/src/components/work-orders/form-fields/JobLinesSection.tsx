import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddJobLineDialog } from '../job-lines/AddJobLineDialog';
import { UnifiedJobLineFormDialog } from '../job-lines/UnifiedJobLineFormDialog';
import { CompactJobLinesTable } from '../job-lines/CompactJobLinesTable';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { WorkOrderServiceSelector } from '../services/WorkOrderServiceSelector';
import { useWorkOrderServiceSelection } from '@/hooks/useWorkOrderServiceSelection';
import { deleteWorkOrderJobLine } from '@/services/workOrder/jobLinesService';
import { toast } from '@/hooks/use-toast';
interface JobLinesSectionProps {
  workOrderId: string;
  description?: string;
  jobLines: WorkOrderJobLine[];
  onJobLinesChange: (jobLines?: WorkOrderJobLine[]) => Promise<void>;
  isEditMode: boolean;
  shopId?: string;
  selectedServicesCount?: number;
}
export function JobLinesSection({
  workOrderId,
  description,
  jobLines,
  onJobLinesChange,
  isEditMode,
  shopId,
  selectedServicesCount = 0
}: JobLinesSectionProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingJobLine, setEditingJobLine] = useState<WorkOrderJobLine | null>(null);
  const [deletingJobLine, setDeletingJobLine] = useState<WorkOrderJobLine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Service selection hook
  const {
    selectedServices,
    addService,
    removeService,
    updateServices,
    convertServicesToJobLines,
    isCreatingJobLines,
    hasSelectedServices
  } = useWorkOrderServiceSelection(workOrderId, onJobLinesChange);

  const handleServiceSelect = (service: any, categoryName: string, subcategoryName: string) => {
    console.log('Service selected:', service.name);
    // The IntegratedServiceSelector handles adding the service internally
  };
  const handleAddJobLine = () => {
    setShowAddDialog(true);
  };

  // Removed custom edit handler to let CompactJobLinesTable use its focused edit dialog

  const handleJobLineAdd = async (jobLines: WorkOrderJobLine[]) => {
    await onJobLinesChange();
    setShowAddDialog(false);
  };
  const handleJobLineSave = async (jobLines: WorkOrderJobLine[]) => {
    await onJobLinesChange();
    setEditingJobLine(null);
  };
  const handleDeleteJobLine = async (jobLineId: string) => {
    const jobLineToDelete = jobLines.find(line => line.id === jobLineId);
    if (!jobLineToDelete) {
      console.error('Job line not found:', jobLineId);
      return;
    }
    setDeletingJobLine(jobLineToDelete);
  };
  const confirmDeleteJobLine = async () => {
    if (!deletingJobLine) return;
    setIsDeleting(true);
    try {
      // Delete job line
      console.log('Deleting job line:', deletingJobLine.id);
      await deleteWorkOrderJobLine(deletingJobLine.id);
      console.log('Job line deleted successfully, refreshing list');
      await onJobLinesChange();

      // Show success message
      toast({
        title: "Success",
        description: "Job line deleted successfully"
      });
      setDeletingJobLine(null);
    } catch (error) {
      console.error('Error deleting job line:', error);

      // Show error message
      toast({
        title: "Error",
        description: "Failed to delete job line. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Service Selection Section */}
      {isEditMode && (
        <WorkOrderServiceSelector
          selectedServices={selectedServices}
          onServiceSelect={handleServiceSelect}
          onRemoveService={removeService}
          onUpdateServices={updateServices}
          onConvertToJobLines={convertServicesToJobLines}
          isConverting={isCreatingJobLines}
        />
      )}

      {/* Labor & Services Section */}
      <Card className={hasSelectedServices ? "border-green-200 bg-green-50/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Labor & Services
          {selectedServicesCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({selectedServicesCount} from service selection + {jobLines.length - selectedServicesCount} manual)
            </span>
          )}
          {hasSelectedServices && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              ({selectedServices.length} services ready to add)
            </span>
          )}
        </CardTitle>
        {isEditMode && (
          <Button onClick={handleAddJobLine} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Manual Job Line
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {jobLines.length > 0 ? (
          <CompactJobLinesTable 
            jobLines={jobLines} 
            onUpdate={onJobLinesChange} 
            onDelete={isEditMode ? handleDeleteJobLine : undefined}
            onAddJobLine={async (jobLine) => {
              console.log('Adding job line:', jobLine);
              
              if (isEditMode) {
                // For existing work orders, save to database and refresh
                await onJobLinesChange();
              } else {
                // For new work orders, add to local state by passing new job lines array
                const newJobLine: WorkOrderJobLine = {
                  ...jobLine,
                  id: `temp-jl-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as WorkOrderJobLine;
                
                await onJobLinesChange([newJobLine]);
              }
            }}
            onAddPart={async (partData) => {
              // Handle adding parts to job lines
              console.log('Adding part:', partData);
              // In real implementation, this would add parts to the database
              // For now, just refresh the job lines
              await onJobLinesChange();
            }}
            onReorder={async (reorderedJobLines) => {
              // Handle reordering job lines
              console.log('Reordering job lines:', reorderedJobLines);
              // In real implementation, this would update display_order in database
              // For now, just refresh the job lines
              await onJobLinesChange();
            }}
            workOrderId={workOrderId}
            isEditMode={isEditMode} 
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            {isEditMode ? 
              "No services selected and no manual job lines added yet. Select services above or click 'Add Manual Job Line' to get started." : 
              "No job lines configured for this work order."
            }
          </div>
        )}
      </CardContent>

      {/* Add Job Line Dialog - Uses comprehensive form with service/manual options */}
      <AddJobLineDialog 
        workOrderId={workOrderId} 
        onJobLineAdd={handleJobLineAdd} 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
      />

      {/* Edit dialog is now handled by CompactJobLinesTable using UnifiedJobLineEditDialog */}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog 
        open={!!deletingJobLine} 
        onOpenChange={open => !open && setDeletingJobLine(null)} 
        onConfirm={confirmDeleteJobLine} 
        title="Delete Job Line" 
        description="Are you sure you want to delete this job line? This action cannot be undone and will also remove any associated parts." 
        itemName={deletingJobLine?.name} 
        isDeleting={isDeleting} 
      />
    </Card>
    </div>
  );
}