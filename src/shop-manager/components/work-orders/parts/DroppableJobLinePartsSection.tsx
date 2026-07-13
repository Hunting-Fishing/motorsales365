
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DraggablePartCard } from './DraggablePartCard';
import { WorkOrderPart } from '@/types/workOrderPart';

interface DroppableJobLinePartsSectionProps {
  jobLineId: string;
  parts: WorkOrderPart[];
  onRemovePart?: (partId: string) => void;
  onEditPart?: (part: WorkOrderPart) => void;
  isEditMode?: boolean;
}

export function DroppableJobLinePartsSection({
  jobLineId,
  parts,
  onRemovePart,
  onEditPart,
  isEditMode = false
}: DroppableJobLinePartsSectionProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `job-line-${jobLineId}`,
    data: {
      type: 'jobLine',
      jobLineId,
    },
  });

  console.log(`DroppableJobLinePartsSection for job line ${jobLineId}: isOver=${isOver}, parts count=${parts.length}`);

  if (parts.length === 0) {
    return (
      <div 
        ref={setNodeRef}
        className={`text-center py-8 px-4 text-muted-foreground border-2 border-dashed rounded-lg transition-all duration-300 ${
          isOver 
            ? 'border-primary bg-primary/20 text-primary scale-[1.02] shadow-lg border-solid' 
            : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/10'
        } ${isEditMode ? 'min-h-[120px] cursor-pointer' : 'min-h-[100px]'}`}
      >
        {isEditMode ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className={`text-xl font-medium transition-all duration-200 ${
              isOver ? 'text-primary animate-bounce' : 'text-muted-foreground'
            }`}>
              {isOver ? '📦 Drop part here!' : '📋 No parts added yet'}
            </div>
            <p className={`text-sm transition-all duration-200 ${
              isOver ? 'text-primary/80 font-medium' : 'text-muted-foreground/70'
            }`}>
              {isOver ? 'Release to add part to this job line' : 'Drag parts here or add new ones'}
            </p>
            {isOver && (
              <div className="w-full max-w-xs h-2 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <span className="text-muted-foreground">No parts added yet</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-3 min-h-[100px] p-4 rounded-lg transition-all duration-300 ${
        isOver 
          ? 'bg-primary/10 border-2 border-dashed border-primary shadow-lg scale-[1.01]' 
          : 'bg-muted/10 border border-transparent hover:bg-muted/20'
      }`}
    >
      {parts.map((part) => (
        <DraggablePartCard
          key={part.id}
          part={part}
          onRemovePart={onRemovePart}
          onEditPart={onEditPart}
          isEditMode={isEditMode}
        />
      ))}
      
      {isOver && (
        <div className="border-2 border-dashed border-primary rounded-lg p-6 bg-primary/10 animate-pulse">
          <p className="text-center text-primary font-bold text-lg">
            📦 Drop part here to add to this job line
          </p>
        </div>
      )}
    </div>
  );
}
