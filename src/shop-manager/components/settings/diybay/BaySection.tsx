
import React from "react";
import { Bay } from "@/services/diybay/diybayService";
import { BayList } from "./BayList";
import { Card, CardContent } from "@/components/ui/card";
import { AddBayButton } from "./AddBayButton";
import { ViewModeToggle } from "./ViewModeToggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BayViewMode } from "@/types/diybay";
import { Loader2, GripVertical, AlertCircle, Printer } from "lucide-react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { printElement } from "@/utils/printUtils";

interface BaySectionProps {
  bays: Bay[];
  viewMode: BayViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<BayViewMode>>;
  isLoading: boolean;
  isSaving: boolean;
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  onAddBay: () => Promise<boolean>;
  onRateChange?: (bay: Bay, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate', value: number) => Promise<boolean>;
  onDragEnd?: (event: DragEndEvent) => void;
}

export const BaySection: React.FC<BaySectionProps> = ({
  bays,
  viewMode,
  setViewMode,
  isLoading,
  isSaving,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  onAddBay,
  onRateChange,
  onDragEnd
}) => {
  const handleViewModeChange = (mode: BayViewMode) => {
    setViewMode(mode);
  };

  const handlePrintBays = () => {
    printElement("diy-bays-content", "DIY Bays Rates");
  };

  return (
    <Card className="mt-8">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">DIY Bays</h2>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-1"
            onClick={handlePrintBays}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <ViewModeToggle 
            viewMode={viewMode} 
            setViewMode={handleViewModeChange} 
          />
          <AddBayButton 
            onAddBay={onAddBay} 
            isSaving={isSaving} 
          />
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
            Active Bay
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 px-3 py-1">
            Inactive Bay
          </Badge>
        </div>
        <div className="flex items-center ml-auto text-sm text-gray-700">
          <div className="flex items-center bg-blue-50 px-3 py-1 rounded-md border border-blue-200 shadow-sm">
            <div className="bg-blue-100 rounded-md p-1 mr-2">
              <GripVertical size={16} className="text-blue-600" />
            </div>
            <span>Drag handles to reorder bays</span>
          </div>
        </div>
      </div>

      <CardContent className="p-4" id="diy-bays-content">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : bays.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-lg">
            <p className="text-gray-500">No bays added yet. Click "Add Bay" to create your first bay.</p>
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={bays.map(bay => bay.id)}
              strategy={verticalListSortingStrategy}
            >
              <BayList
                bays={bays}
                viewMode={viewMode}
                onStatusChange={onStatusChange}
                onEditClick={onEditClick}
                onDeleteClick={onDeleteClick}
                onHistoryClick={onHistoryClick}
                onRateChange={onRateChange}
                isSaving={isSaving}
                sortable={true}
                isLoading={isLoading}
              />
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
};
