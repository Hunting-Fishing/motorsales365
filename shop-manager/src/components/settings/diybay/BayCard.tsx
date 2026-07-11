
import React from "react";
import { Bay } from "@/services/diybay/diybayService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, History, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/formatters";

interface BayCardProps {
  bay: Bay;
  onStatusChange: (bay: Bay, isActive: boolean) => Promise<void>;
  onEditClick: (bay: Bay) => void;
  onDeleteClick: (bay: Bay) => void;
  onHistoryClick: (bay: Bay) => Promise<void>;
  isSaving?: boolean;
  isDragging?: boolean;
}

export const BayCard: React.FC<BayCardProps> = ({
  bay,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onHistoryClick,
  isSaving = false,
  isDragging = false
}) => {
  // Set card colors based on active status
  const cardStatusClasses = bay.is_active 
    ? 'border-green-300 bg-green-50' 
    : 'border-red-300 bg-red-50';
    
  return (
    <Card className={`${cardStatusClasses} overflow-hidden transition-all duration-200`}>
      <CardHeader className="pb-3 relative">
        <div className="absolute top-2 right-2">
          <GripVertical 
            size={20} 
            className={`text-gray-400 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
          />
        </div>
        
        <CardTitle className="text-lg font-bold">{bay.bay_name}</CardTitle>
        {bay.bay_location && (
          <span className="text-sm text-gray-600 block -mt-1">{bay.bay_location}</span>
        )}
        
        <div className="flex items-center mt-2 space-x-2">
          <Switch
            checked={bay.is_active}
            onCheckedChange={(checked) => onStatusChange(bay, checked)}
            disabled={isSaving}
          />
          <Badge 
            className={
              bay.is_active 
                ? "bg-green-100 text-green-800 border border-green-300" 
                : "bg-red-100 text-red-800 border border-red-300"
            }
          >
            {bay.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hourly Rate</label>
              <div className="text-lg font-semibold">{formatCurrency(bay.hourly_rate)}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Daily Rate</label>
              <div>{bay.daily_rate ? formatCurrency(bay.daily_rate) : "—"}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Weekly Rate</label>
              <div>{bay.weekly_rate ? formatCurrency(bay.weekly_rate) : "—"}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Monthly Rate</label>
              <div>{bay.monthly_rate ? formatCurrency(bay.monthly_rate) : "—"}</div>
            </div>
          </div>
          
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onHistoryClick(bay)}
              disabled={isSaving}
            >
              <History className="h-4 w-4 mr-1" />
              <span>History</span>
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => onEditClick(bay)}
                disabled={isSaving}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onDeleteClick(bay)}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
