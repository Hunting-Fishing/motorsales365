import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Edit, 
  Trash2, 
  PrinterIcon, 
  Share2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Calendar,
  DollarSign
} from 'lucide-react';
import { WorkOrder } from '@/types/workOrder';

interface WorkOrderActionButtonsProps {
  workOrder: WorkOrder;
  onInvoiceCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onComplete?: () => void;
  onSchedule?: () => void;
  onMessage?: () => void;
  onQuote?: () => void;
  className?: string;
}

export function WorkOrderActionButtons({
  workOrder,
  onInvoiceCreate,
  onEdit,
  onDelete,
  onPrint,
  onShare,
  onComplete,
  onSchedule,
  onMessage,
  onQuote,
  className = ''
}: WorkOrderActionButtonsProps) {
  const isCompleted = workOrder.status === 'completed';
  const isDraft = workOrder.status === 'draft';
  const canComplete = ['in_progress', 'quality_check'].includes(workOrder.status);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Actions */}
      <div className="flex flex-col gap-2">
        {!isCompleted && (
          <Button
            onClick={onEdit}
            className="btn-gradient-primary hover-lift w-full justify-start gap-3 py-3 px-4"
          >
            <Edit className="h-4 w-4" />
            Edit Work Order
          </Button>
        )}

        {canComplete && (
          <Button
            onClick={onComplete}
            className="bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80 text-success-foreground hover-lift w-full justify-start gap-3 py-3 px-4"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Complete
          </Button>
        )}

        {isCompleted && (
          <Button
            onClick={onInvoiceCreate}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald/90 hover:to-emerald/80 text-white hover-lift w-full justify-start gap-3 py-3 px-4"
          >
            <FileText className="h-4 w-4" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onSchedule}
          variant="outline"
          className="hover-lift justify-start gap-2 py-2.5 px-3 glass-card"
        >
          <Calendar className="h-4 w-4" />
          Schedule
        </Button>

        <Button
          onClick={onMessage}
          variant="outline"
          className="hover-lift justify-start gap-2 py-2.5 px-3 glass-card"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Button>

        <Button
          onClick={onQuote}
          variant="outline"
          className="hover-lift justify-start gap-2 py-2.5 px-3 glass-card"
        >
          <DollarSign className="h-4 w-4" />
          Quote
        </Button>

        <Button
          onClick={onPrint}
          variant="outline"
          className="hover-lift justify-start gap-2 py-2.5 px-3 glass-card"
        >
          <PrinterIcon className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Utility Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onShare}
          variant="ghost"
          size="sm"
          className="hover-scale flex-1 glass-card"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        {!isDraft && (
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="hover-scale text-error hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Status Badge */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-body">Status</span>
          <div className={`status-badge ${
            workOrder.status === 'completed' ? 'status-completed' :
            workOrder.status === 'in_progress' ? 'status-in-progress' :
            workOrder.status === 'pending' ? 'status-pending' :
            workOrder.status === 'cancelled' ? 'status-cancelled' :
            'status-on-hold'
          }`}>
            <div className="w-2 h-2 rounded-full bg-current opacity-70" />
            {workOrder.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        
        {workOrder.priority && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground font-body">Priority</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              workOrder.priority === 'high' ? 'bg-error/20 text-error' :
              workOrder.priority === 'medium' ? 'bg-warning/20 text-warning' :
              'bg-muted/40 text-muted-foreground'
            }`}>
              {workOrder.priority.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}