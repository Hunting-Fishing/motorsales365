
import React from "react";
import { 
  Table, 
  TableBody,
} from "@/components/ui/table";
import { Bay } from "@/services/diybay/diybayService";
import { DraggableBayRow } from "./DraggableBayRow";
import { BaysTableHeader } from "./BaysTableHeader";
import { BaysEmptyState } from "./BaysEmptyState";

interface BaysTableProps {
  bays: Bay[];
  isLoading: boolean;
  isSaving: boolean;
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  onRateChange: (bay: Bay, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate', value: number) => Promise<boolean>;
}

const BaysTable: React.FC<BaysTableProps> = ({
  bays,
  isLoading,
  isSaving,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  onRateChange
}) => {
  if (isLoading || !bays || bays.length === 0) {
    return <BaysEmptyState isLoading={isLoading} />;
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table className="min-w-full">
        <BaysTableHeader />
        <TableBody>
          {bays.map((bay) => (
            <DraggableBayRow 
              key={bay.id} 
              bay={bay} 
              isSaving={isSaving} 
              onStatusChange={onStatusChange}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onHistoryClick={onHistoryClick}
              onRateChange={onRateChange}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BaysTable;
