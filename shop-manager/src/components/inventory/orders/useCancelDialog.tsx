
import { useState } from 'react';
import { useInventoryOrders } from "@/hooks/inventory/useInventoryOrders";
import { InventoryOrder } from "@/types/inventory/orders";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function useCancelDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InventoryOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const { cancelOrder } = useInventoryOrders();
  
  const openCancelDialog = (order: InventoryOrder) => {
    setSelectedOrder(order);
    setIsOpen(true);
  };

  const closeCancelDialog = () => {
    setIsOpen(false);
    setSelectedOrder(null);
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    
    setLoading(true);
    try {
      await cancelOrder(selectedOrder.id);
      closeCancelDialog();
    } catch (error) {
      console.error("Failed to cancel order:", error);
    } finally {
      setLoading(false);
    }
  };

  const CancelDialog = () => {
    if (!selectedOrder) return null;
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Item: {selectedOrder.item_name}</p>
              <p className="text-sm text-muted-foreground">Order ID: {selectedOrder.id}</p>
              <p className="text-sm">Quantity Ordered: {selectedOrder.quantity_ordered}</p>
              <p className="text-sm">Supplier: {selectedOrder.supplier}</p>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCancelDialog} disabled={loading}>
                No, Keep Order
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancel} 
                disabled={loading || selectedOrder.status === 'cancelled'}
              >
                {loading ? "Cancelling..." : "Yes, Cancel Order"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return {
    openCancelDialog,
    closeCancelDialog,
    CancelDialog
  };
}
