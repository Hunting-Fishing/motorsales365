
import React from "react";
import { Bay } from "@/services/diybay/diybayService";
import { BayCard } from "./BayCard";
import BaysTable from "./BaysTable";  // Changed from { BaysTable }
import { CompactBayList } from "./CompactBayList";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BayListProps {
  bays: Bay[];
  viewMode: "table" | "cards" | "compact";
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  onRateChange?: (bay: Bay, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate', value: number) => Promise<boolean>;
  isSaving?: boolean;
  sortable?: boolean;
  isLoading?: boolean;  // Add isLoading prop to the interface
}

// Sortable wrapper for BayCard
const SortableBayCard = ({ bay, onStatusChange, onEditClick, onDeleteClick, onHistoryClick, isSaving = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: bay.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`mb-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} {...attributes} {...listeners}>
      <BayCard
        bay={bay}
        onStatusChange={onStatusChange}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onHistoryClick={onHistoryClick}
        isSaving={isSaving}
        isDragging={isDragging}
      />
    </div>
  );
};

export const BayList: React.FC<BayListProps> = ({
  bays,
  viewMode,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  onRateChange,
  isSaving = false,
  sortable = false,
  isLoading = false,  // Add default value for isLoading
}) => {
  if (viewMode === "cards") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bays.map((bay) => (
          sortable ? (
            <SortableBayCard
              key={bay.id}
              bay={bay}
              onStatusChange={onStatusChange}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onHistoryClick={onHistoryClick}
              isSaving={isSaving}
            />
          ) : (
            <BayCard
              key={bay.id}
              bay={bay}
              onStatusChange={onStatusChange}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onHistoryClick={onHistoryClick}
              isSaving={isSaving}
            />
          )
        ))}
      </div>
    );
  } else if (viewMode === "compact") {
    return (
      <CompactBayList
        bays={bays}
        onStatusChange={onStatusChange}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onHistoryClick={onHistoryClick}
        isSaving={isSaving}
        sortable={sortable}
        isLoading={isLoading} // Pass isLoading prop to CompactBayList
      />
    );
  } else {
    return (
      <BaysTable
        bays={bays}
        isLoading={isLoading}  // Pass isLoading prop
        isSaving={isSaving}
        onStatusChange={onStatusChange}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onHistoryClick={onHistoryClick}
        onRateChange={onRateChange}
      />
    );
  }
};
