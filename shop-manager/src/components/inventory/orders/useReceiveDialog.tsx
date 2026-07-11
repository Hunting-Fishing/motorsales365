
import { useState } from 'react';
import { useInventoryOrders } from "@/hooks/inventory/useInventoryOrders";
import { InventoryOrder, ReceiveInventoryOrderDto } from "@/types/inventory/orders";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function useReceiveDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InventoryOrder | null>(null);
  const [quantityToReceive, setQuantityToReceive] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { receiveOrder } = useInventoryOrders();
  const { toast } = useToast();
  
  const openReceiveDialog = (order: InventoryOrder) => {
    setSelectedOrder(order);
    setQuantityToReceive(order.quantity_ordered - order.quantity_received);
    setIsOpen(true);
  };

  const closeReceiveDialog = () => {
    setIsOpen(false);
    setSelectedOrder(null);
    setQuantityToReceive(0);
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;
    
    if (quantityToReceive <= 0) {
      toast({
        title: "Validation Error",
        description: "Quantity to receive must be greater than zero",
        variant: "destructive"
      });
      return;
    }

    const remainingQuantity = selectedOrder.quantity_ordered - selectedOrder.quantity_received;
    if (quantityToReceive > remainingQuantity) {
      toast({
        title: "Validation Error",
        description: `You can only receive up to ${remainingQuantity} units`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const receiveData: ReceiveInventoryOrderDto = {
        order_id: selectedOrder.id,
        quantity_to_receive: quantityToReceive
      };
      
      await receiveOrder(receiveData);
      closeReceiveDialog();
    } catch (error) {
      console.error("Failed to receive inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const ReceiveDialog = () => {
    if (!selectedOrder) return null;
    
    const remainingQuantity = selectedOrder.quantity_ordered - selectedOrder.quantity_received;
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receive Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Item: {selectedOrder.item_name}</p>
              <p className="text-sm text-muted-foreground">Order ID: {selectedOrder.id}</p>
              <p className="text-sm">
                Ordered: {selectedOrder.quantity_ordered} | 
                Received: {selectedOrder.quantity_received} | 
                Remaining: {remainingQuantity}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity_to_receive">Quantity to Receive</Label>
              <Input 
                id="quantity_to_receive" 
                type="number" 
                min="1"
                max={remainingQuantity}
                value={quantityToReceive}
                onChange={(e) => setQuantityToReceive(parseInt(e.target.value) || 0)}
                disabled={loading}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeReceiveDialog} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleReceive} 
                disabled={loading || quantityToReceive <= 0 || quantityToReceive > remainingQuantity}
              >
                {loading ? "Processing..." : "Receive Items"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return {
    openReceiveDialog,
    closeReceiveDialog,
    ReceiveDialog
  };
}
