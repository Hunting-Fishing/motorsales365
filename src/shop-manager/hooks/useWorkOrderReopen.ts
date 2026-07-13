
import { useState } from 'react';
import { updateWorkOrderStatus } from '@sm/services/workOrder';
import { toast } from '@sm/hooks/use-toast';

export function useWorkOrderReopen() {
  const [isReopening, setIsReopening] = useState(false);

  const reopenWorkOrder = async (workOrderId: string, newStatus: string = 'in-progress') => {
    console.log('🔄 HOOK DEBUG: reopenWorkOrder called');
    console.log('🔄 HOOK DEBUG: Work Order ID:', workOrderId);
    console.log('🔄 HOOK DEBUG: New Status:', newStatus);
    
    setIsReopening(true);
    
    try {
      console.log('🔄 HOOK DEBUG: Calling updateWorkOrderStatus service...');
      const updatedWorkOrder = await updateWorkOrderStatus(workOrderId, newStatus);
      console.log('🔄 HOOK DEBUG: Service returned:', updatedWorkOrder);
      
      if (updatedWorkOrder) {
        console.log('🔄 HOOK DEBUG: Success! Showing success toast');
        toast({
          title: "Success",
          description: "Work order has been reopened and is now editable",
        });
        
        return { success: true, data: updatedWorkOrder };
      } else {
        console.log('🔄 HOOK DEBUG: Service returned null/undefined');
        throw new Error('Failed to reopen work order');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reopen work order';
      console.error('🔄 HOOK DEBUG: Error occurred:', err);
      console.error('🔄 HOOK DEBUG: Error message:', errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return { success: false, error: errorMessage };
    } finally {
      console.log('🔄 HOOK DEBUG: Setting isReopening to false');
      setIsReopening(false);
    }
  };

  return {
    reopenWorkOrder,
    isReopening
  };
}
