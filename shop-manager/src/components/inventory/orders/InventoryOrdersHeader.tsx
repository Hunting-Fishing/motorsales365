
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useCreateOrderDialog } from "./useCreateOrderDialog";

export function InventoryOrdersHeader() {
  const { openDialog } = useCreateOrderDialog();
  
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold tracking-tight">Items on Order</h1>
      <Button 
        onClick={(e) => openDialog()} 
        className="bg-green-600 hover:bg-green-700"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        New Order
      </Button>
    </div>
  );
}
