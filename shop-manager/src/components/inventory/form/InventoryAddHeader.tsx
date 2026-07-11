
import { Button } from "@/components/ui/button";

interface InventoryAddHeaderProps {
  onCancel: () => void;
}

export function InventoryAddHeader({ onCancel }: InventoryAddHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Add Inventory Item</h1>
      <Button 
        variant="outline" 
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
}
