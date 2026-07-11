import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableTimeSlotProps {
  dayOfWeek: number;
  timeSlot: string;
  children: React.ReactNode;
}

export function DroppableTimeSlot({ dayOfWeek, timeSlot, children }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayOfWeek}-${timeSlot}`,
    data: { dayOfWeek, timeSlot }
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-2 rounded-md transition-colors ${
        isOver ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/30'
      }`}
    >
      {children}
    </div>
  );
}
