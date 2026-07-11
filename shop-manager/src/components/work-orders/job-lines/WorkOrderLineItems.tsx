import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { JobLinesTable } from './JobLinesTable';
import { WorkOrderPartsSection } from '../parts/WorkOrderPartsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wrench } from 'lucide-react';
import { QuickAddDropdown } from '../details/QuickAddDropdown';
import { ServiceBasedJobLineForm } from './ServiceBasedJobLineForm';
import { generateTempJobLineId } from '@/services/jobLineParserEnhanced';

interface WorkOrderLineItemsProps {
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  workOrderId: string;
  isEditMode: boolean;
  onJobLinesChange: (jobLines: WorkOrderJobLine[]) => void;
  onPartsChange?: () => Promise<void>;
  onJobLineUpdate?: (jobLine: WorkOrderJobLine) => void;
  onJobLineDelete?: (jobLineId: string) => void;
  onJobLineReorder?: (reorderedJobLines: WorkOrderJobLine[]) => void;
  onJobLineToggleCompletion?: (jobLine: WorkOrderJobLine, completed: boolean) => Promise<void>;
  onPartUpdate?: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  onPartDelete?: (partId: string) => void;
  onPartReorder?: (partIds: string[]) => Promise<void>;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
}

export function WorkOrderLineItems({
  jobLines,
  allParts,
  workOrderId,
  isEditMode,
  onJobLinesChange,
  onPartsChange,
  onJobLineUpdate,
  onJobLineDelete,
  onJobLineReorder,
  onJobLineToggleCompletion,
  onPartUpdate,
  onPartDelete,
  onPartReorder,
  onAddPart
}: WorkOrderLineItemsProps) {
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showPartsForm, setShowPartsForm] = useState(false);
  const [showSubletForm, setShowSubletForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Handle adding new job lines
  const handleAddJobLine = (jobLineData: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>) => {
    const newJobLine: WorkOrderJobLine = {
      ...jobLineData,
      id: generateTempJobLineId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedJobLines = [...jobLines, newJobLine];
    onJobLinesChange(updatedJobLines);
  };

  // Handle job line updates
  const handleJobLineUpdate = async (updatedJobLine: WorkOrderJobLine) => {
    try {
      if (onJobLineUpdate) {
        await onJobLineUpdate(updatedJobLine);
      } else {
        // Fallback to local update if no handler provided
        const updatedJobLines = jobLines.map(jobLine =>
          jobLine.id === updatedJobLine.id ? {
            ...updatedJobLine,
            updated_at: new Date().toISOString()
          } : jobLine
        );
        onJobLinesChange(updatedJobLines);
      }
    } catch (error) {
      console.error('Error updating job line:', error);
    }
  };

  // Handle job line deletion
  const handleJobLineDelete = async (jobLineId: string) => {
    try {
      if (onJobLineDelete) {
        await onJobLineDelete(jobLineId);
      } else {
        // Fallback to local deletion if no handler provided
        const updatedJobLines = jobLines.filter(jobLine => jobLine.id !== jobLineId);
        onJobLinesChange(updatedJobLines);
      }
    } catch (error) {
      console.error('Error deleting job line:', error);
    }
  };

  // Handle auto-opening forms based on type selection
  const handleAddItem = (type: 'labor' | 'parts' | 'sublet' | 'note') => {
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
  const handleJobLineSave = (newJobLines: WorkOrderJobLine[]) => {
    newJobLines.forEach(jobLine => {
      const { id, created_at, updated_at, ...jobLineData } = jobLine;
      handleAddJobLine(jobLineData);
    });
    
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

  return (
    <div className="space-y-6">
      {/* Job Lines Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Job Lines
              {jobLines.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({jobLines.length})
                </span>
              )}
            </CardTitle>
            {isEditMode && (
              <div className="flex gap-2">
                <QuickAddDropdown onAddItem={handleAddItem} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <JobLinesTable
            jobLines={jobLines}
            allParts={allParts}
            isEditMode={isEditMode}
            onUpdate={handleJobLineUpdate}
            onDelete={handleJobLineDelete}
            onReorder={onJobLineReorder}
            onToggleCompletion={onJobLineToggleCompletion}
            onAddPart={onAddPart}
          />
        </CardContent>
      </Card>

      {/* Work Order Level Parts Section */}
        <WorkOrderPartsSection
          parts={allParts}
          isEditMode={isEditMode}
          onPartUpdate={onPartUpdate}
          onPartDelete={onPartDelete}
          onPartReorder={onPartReorder}
          onAdd={onAddPart}
          workOrderId={workOrderId}
        />

      {/* Service-based forms */}
      {showLaborForm && (
        <ServiceBasedJobLineForm
          workOrderId={workOrderId}
          onSave={handleJobLineSave}
          onCancel={handleFormCancel}
        />
      )}

      {showPartsForm && (
        <ServiceBasedJobLineForm
          workOrderId={workOrderId}
          onSave={handleJobLineSave}
          onCancel={handleFormCancel}
        />
      )}

      {showSubletForm && (
        <ServiceBasedJobLineForm
          workOrderId={workOrderId}
          onSave={handleJobLineSave}
          onCancel={handleFormCancel}
        />
      )}

      {showNoteForm && (
        <ServiceBasedJobLineForm
          workOrderId={workOrderId}
          onSave={handleJobLineSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}