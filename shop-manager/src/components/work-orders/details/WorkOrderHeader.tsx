
import React, { useState } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit3, Save, X, Calendar, User, FileText } from 'lucide-react';
import { WORK_ORDER_STATUSES } from '@/data/workOrderConstants';
import { useWorkOrderStatus } from '@/hooks/useWorkOrderStatus';

interface WorkOrderHeaderProps {
  workOrder: WorkOrder;
  customer: Customer | null;
  isEditMode: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

export function WorkOrderHeader({
  workOrder,
  customer,
  isEditMode,
  onStartEdit,
  onCancelEdit,
  onSaveEdit
}: WorkOrderHeaderProps) {
  const { status, updateStatus, isUpdating } = useWorkOrderStatus(workOrder.id, workOrder.status);
  const [localStatus, setLocalStatus] = useState(status);

  const getStatusColor = (statusValue: string) => {
    switch (statusValue?.toLowerCase()) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200';
      case 'on-hold':
        return 'bg-gradient-to-r from-orange-100 to-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLocalStatus(newStatus);
    if (!isEditMode) {
      await updateStatus(newStatus);
    }
  };

  const handleSave = async () => {
    if (localStatus !== status) {
      await updateStatus(localStatus);
    }
    onSaveEdit();
  };

  const handleCancel = () => {
    setLocalStatus(status);
    onCancelEdit();
  };

  return (
    <div className="bg-gradient-to-r from-white via-slate-50/80 to-blue-50/50 p-8 rounded-xl border border-slate-200/60 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Work Order #{workOrder.work_order_number || workOrder.id.slice(0, 8)}
              </h1>
            </div>
            
            {isEditMode ? (
              <Select value={localStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-48 h-10 bg-white border-slate-300 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-lg">
                  {WORK_ORDER_STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value} className="py-2">
                      <Badge className={getStatusColor(statusOption.value)}>
                        {statusOption.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`${getStatusColor(status)} px-4 py-2 text-sm font-medium border shadow-sm`}>
                {WORK_ORDER_STATUSES.find(s => s.value === status)?.label || status}
              </Badge>
            )}
          </div>
          
          <div className="space-y-3">
            {customer && (
              <div className="flex items-center gap-2 text-slate-700">
                <User className="h-5 w-5 text-slate-500" />
                <span className="font-medium">Customer:</span>
                <span className="text-slate-900 font-semibold">
                  {customer.first_name} {customer.last_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-700">
              <FileText className="h-5 w-5 text-slate-500" />
              <span className="font-medium">Description:</span>
              <span className="text-slate-900">{workOrder.description}</span>
            </div>
            {workOrder.created_at && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="font-medium">Created:</span>
                <span>{new Date(workOrder.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isEditMode ? (
            <>
              <Button 
                size="lg" 
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleCancel}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button 
              size="lg" 
              onClick={onStartEdit}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Work Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
