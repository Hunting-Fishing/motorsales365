import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { WorkScheduleAssignment } from '@/types/scheduling';

interface DraggableScheduleItemProps {
  schedule: WorkScheduleAssignment;
  children: React.ReactNode;
}

export function DraggableScheduleItem({ schedule, children }: DraggableScheduleItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: schedule.id,
    data: schedule
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-2 cursor-move ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Card>
  );
}
