
import { useState } from "react";
import { DragEndEvent } from '@dnd-kit/core';
import { Column } from "./SortableColumnHeader";

export const useColumnDragDrop = (initialColumns: Column[]) => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);
        
        return newItems;
      });
    }
  };

  return {
    columns,
    setColumns,
    handleDragEnd
  };
};
