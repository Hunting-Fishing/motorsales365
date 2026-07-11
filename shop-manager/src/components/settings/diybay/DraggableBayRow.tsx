
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Bay } from "@/services/diybay/diybayService";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EditableCell } from "@/components/settings/diybay/EditableCell";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/formatters";

interface DraggableBayRowProps {
  bay: Bay;
  isSaving: boolean;
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  onRateChange: (bay: Bay, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate', value: number) => Promise<boolean>;
}

export const DraggableBayRow: React.FC<DraggableBayRowProps> = ({ 
  bay, 
  isSaving,
  onStatusChange, 
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  onRateChange
}) => {
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
  };

  const handleRateChange = async (value: string, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate'): Promise<boolean> => {
    return await onRateChange(bay, field, parseFloat(value));
  };

  // Define status-based styling classes
  const statusClasses = bay.is_active 
    ? 'bg-green-50 border-green-200' 
    : 'bg-red-50 border-red-200';

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={`border-b transition-colors ${statusClasses} hover:${bay.is_active ? 'bg-green-100' : 'bg-red-100'} mb-2`}
    >
      <TableCell className="w-10">
        <div
          {...attributes}
          {...listeners}
          className="flex h-full items-center justify-center cursor-grab bg-blue-100 hover:bg-blue-200 rounded p-1"
        >
          <GripVertical size={18} className="text-blue-600" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {bay.bay_name}
        {bay.bay_location && <span className="text-gray-500 text-xs block mt-1">{bay.bay_location}</span>}
      </TableCell>
      <TableCell>{bay.bay_location || "—"}</TableCell>
      <EditableCell
        value={bay.hourly_rate}
        onSave={(value) => handleRateChange(value, 'hourly_rate')}
        isNumber={true}
        formatValue={(val) => formatCurrency(val || 0)}
        disabled={isSaving}
        prefix="$"
      />
      <EditableCell
        value={bay.daily_rate}
        onSave={(value) => handleRateChange(value, 'daily_rate')}
        isNumber={true}
        formatValue={(val) => formatCurrency(val || 0)}
        disabled={isSaving}
        prefix="$"
      />
      <EditableCell
        value={bay.weekly_rate}
        onSave={(value) => handleRateChange(value, 'weekly_rate')}
        isNumber={true}
        formatValue={(val) => formatCurrency(val || 0)}
        disabled={isSaving}
        prefix="$"
      />
      <EditableCell
        value={bay.monthly_rate}
        onSave={(value) => handleRateChange(value, 'monthly_rate')}
        isNumber={true}
        formatValue={(val) => formatCurrency(val || 0)}
        disabled={isSaving}
        prefix="$"
      />
      <TableCell>
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
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => onEditClick(bay)}
            disabled={isSaving}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onDeleteClick(bay)}
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
