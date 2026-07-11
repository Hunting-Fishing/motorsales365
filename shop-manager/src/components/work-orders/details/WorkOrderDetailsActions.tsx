import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorkOrder } from '@/types/workOrder';
import { ConvertToInvoiceButton } from '../ConvertToInvoiceButton';
import { Printer, Share, RotateCcw, Zap, Loader2 } from 'lucide-react';
import { useWorkOrderReopen } from '@/hooks/useWorkOrderReopen';
import { printElement } from '@/utils/printUtils';
import { convertWorkOrderToInvoice } from '@/services/quote/quoteService';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface WorkOrderDetailsActionsProps {
  workOrder: WorkOrder;
  onInvoiceCreated?: (invoiceId: string) => void;
  onWorkOrderUpdated?: () => void;
}

export function WorkOrderDetailsActions({ 
  workOrder, 
  onInvoiceCreated,
  onWorkOrderUpdated 
}: WorkOrderDetailsActionsProps) {
  const { reopenWorkOrder, isReopening } = useWorkOrderReopen();
  const [isCreatingQuickInvoice, setIsCreatingQuickInvoice] = useState(false);
  const navigate = useNavigate();
  
  const handleReopenWorkOrder = async () => {
    try {
      const result = await reopenWorkOrder(workOrder.id, 'in-progress');
      if (result.success && onWorkOrderUpdated) {
        onWorkOrderUpdated();
      }
    } catch (error) {
      console.error('Error reopening work order:', error);
    }
  };

  const handleQuickInvoice = async () => {
    if (workOrder.status !== 'completed') {
      toast({
        title: "Cannot Create Invoice",
        description: "Work order must be completed before creating an invoice.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingQuickInvoice(true);
    try {
      const invoiceId = await convertWorkOrderToInvoice(
        workOrder.id, 
        'Quick invoice created from work order'
      );
      
      toast({
        title: "Invoice Created",
        description: "Invoice has been created with all work order items.",
      });
      
      if (onInvoiceCreated) {
        onInvoiceCreated(invoiceId);
      }
      
      navigate(`/invoices/${invoiceId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    } finally {
      setIsCreatingQuickInvoice(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isCompleted = workOrder.status === 'completed';

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
      
      <Button variant="outline" size="sm">
        <Share className="h-4 w-4 mr-2" />
        Share
      </Button>

      {isCompleted && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleReopenWorkOrder}
          disabled={isReopening}
          className="bg-background border-border hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {isReopening ? 'Reopening...' : 'Reopen Work Order'}
        </Button>
      )}

      {isCompleted && (
        <Button 
          size="sm"
          onClick={handleQuickInvoice}
          disabled={isCreatingQuickInvoice}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isCreatingQuickInvoice ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Quick Invoice
            </>
          )}
        </Button>
      )}

      <ConvertToInvoiceButton
        workOrderId={workOrder.id}
        workOrderStatus={workOrder.status}
        onSuccess={onInvoiceCreated}
      />
    </div>
  );
}
