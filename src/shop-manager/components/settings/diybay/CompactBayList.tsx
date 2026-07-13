
import React from "react";
import { Bay } from "@/services/diybay/diybayService";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, History } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CompactBayListProps {
  bays: Bay[];
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  isSaving?: boolean;
  sortable?: boolean;
  isLoading?: boolean;
}

export const CompactBayList: React.FC<CompactBayListProps> = ({
  bays,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  isSaving = false,
  sortable = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading bays...</div>;
  }

  if (!bays || bays.length === 0) {
    return <div className="text-center py-8">No bays found. Add your first bay to get started.</div>;
  }

  return (
    <div className="space-y-2">
      {bays.map((bay) => (
        sortable ? (
          <SortableBayItem
            key={bay.id}
            bay={bay}
            onStatusChange={onStatusChange}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onHistoryClick={onHistoryClick}
            isSaving={isSaving}
          />
        ) : (
          <BayItem
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
};

interface BayItemProps {
  bay: Bay;
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  isSaving?: boolean;
}

const BayItem: React.FC<BayItemProps> = ({
  bay,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  isSaving = false,
}) => {
  // Always apply status-based colors
  const statusClasses = bay.is_active 
    ? 'border-green-300 bg-green-50 hover:bg-green-100' 
    : 'border-red-300 bg-red-50 hover:bg-red-100';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${statusClasses}`}>
      <div className="flex items-center space-x-3">
        <div className="bg-blue-100 hover:bg-blue-200 rounded p-1 cursor-grab">
          <GripVertical size={18} className="text-blue-600" />
        </div>
        <div>
          <div className="font-medium">{bay.bay_name}</div>
          <div className="text-sm text-gray-600">{bay.bay_location}</div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-right mr-4">
          <div className="text-sm font-medium">{formatCurrency(bay.hourly_rate)}/hr</div>
          <div className="text-xs text-gray-600">{bay.daily_rate ? `${formatCurrency(bay.daily_rate)}/day` : "—"}</div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={bay.is_active}
            onCheckedChange={(checked) => onStatusChange(bay, checked)}
            disabled={isSaving}
          />
          <Badge className={bay.is_active ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"}>
            {bay.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => onEditClick(bay)}
            disabled={isSaving}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onDeleteClick(bay)}
            disabled={isSaving}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const SortableBayItem: React.FC<BayItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.bay.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`mb-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
      {...attributes} 
      {...listeners}
    >
      <BayItem {...props} />
    </div>
  );
};
