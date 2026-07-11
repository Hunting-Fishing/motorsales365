
import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { JobLineCard } from './JobLineCard';
import { AddJobLineDialog } from './AddJobLineDialog';
import { DraggablePartCard } from '../parts/DraggablePartCard';
import { usePartsDragDrop } from '@/hooks/usePartsDragDrop';

interface JobLinesGridProps {
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onUpdate: (updatedJobLine: WorkOrderJobLine) => void;
  onDelete: (jobLineId: string) => void;
  onJobLinesChange: (jobLines: WorkOrderJobLine[]) => void;
  isEditMode?: boolean;
  parts?: WorkOrderPart[];
  onPartsChange?: (parts: WorkOrderPart[]) => void;
}

export function JobLinesGrid({
  workOrderId,
  jobLines,
  onUpdate,
  onDelete,
  onJobLinesChange,
  isEditMode = false,
  parts = [],
  onPartsChange
}: JobLinesGridProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activePart, setActivePart] = useState<WorkOrderPart | null>(null);

  // Ensure we have a valid onPartsChange function
  const handlePartsChange = onPartsChange || (() => {
    console.warn('No onPartsChange handler provided');
  });

  const { handleDragEnd } = usePartsDragDrop(parts, handlePartsChange);

  const handleAddJobLines = (newJobLinesData: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>[]) => {
    const newJobLines: WorkOrderJobLine[] = newJobLinesData.map(jobLineData => ({
      ...jobLineData,
      id: `temp-${Date.now()}-${Math.random()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const updatedJobLines = [...jobLines, ...newJobLines];
    onJobLinesChange(updatedJobLines);
    setShowAddDialog(false);
  };

  const handleDragStart = (event: any) => {
    const partId = event.active.id;
    const part = parts.find(p => p.id === partId);
    console.log('Drag started for part:', part);
    setActivePart(part || null);
  };

  const handleDragEndInternal = (event: any) => {
    console.log('Drag ended, calling handleDragEnd');
    setActivePart(null);
    handleDragEnd(event);
  };

  const handlePartEdit = (updatedPart: WorkOrderPart) => {
    const updatedParts = parts.map(p => p.id === updatedPart.id ? updatedPart : p);
    handlePartsChange(updatedParts);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndInternal}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Labor & Services</CardTitle>
            {isEditMode && (
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Job Line
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No job lines added yet</p>
              {isEditMode && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Job Line
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobLines.map((jobLine) => (
                <JobLineCard
                  key={jobLine.id}
                  jobLine={jobLine}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          )}
        </CardContent>

        {showAddDialog && (
          <AddJobLineDialog
            workOrderId={workOrderId}
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            onJobLineAdd={handleAddJobLines}
          />
        )}
      </Card>

      <DragOverlay>
        {activePart ? (
          <div className="opacity-90 rotate-3 scale-105 shadow-2xl">
            <DraggablePartCard
              part={activePart}
              jobLines={jobLines}
              onEditPart={handlePartEdit}
              isEditMode={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
