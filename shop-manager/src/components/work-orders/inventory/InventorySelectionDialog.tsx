
import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InventoryItemExtended } from "@/types/inventory";
import { getStatusColorClass } from "@/utils/inventory/inventoryCalculations";
import { Loader2, Package, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { standardizeInventoryItem } from "@/utils/inventory/adapters";

interface InventorySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: InventoryItemExtended) => void;
}

export const InventorySelectionDialog: React.FC<InventorySelectionDialogProps> = ({
  open,
  onOpenChange,
  onAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch inventory items
  const { data: inventoryItems, isLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return (data || []).map(item => standardizeInventoryItem(item));
    },
    enabled: open // Only fetch when dialog is open
  });
  
  // Filter items based on search term
  const filteredItems = searchTerm 
    ? inventoryItems?.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : inventoryItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" /> 
            Select Inventory Item
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or category..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredItems?.length ? (
            <div className="divide-y">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex justify-between items-center p-3 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-slate-500">
                      {item.sku} - ${item.unit_price?.toFixed(2)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColorClass(item.status || "In Stock")}`}>
                        {item.status || "In Stock"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.quantity || 0} in stock
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onAddItem(item)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No matching inventory items found.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
