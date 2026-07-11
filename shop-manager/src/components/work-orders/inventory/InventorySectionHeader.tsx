
import React from "react";
import { Button } from "@/components/ui/button";
import { Package, PlusCircle } from "lucide-react";

interface InventorySectionHeaderProps {
  onShowDialog: () => void;
  onShowSpecialOrderDialog: () => void;
  totalItems: number;
}

export const InventorySectionHeader: React.FC<InventorySectionHeaderProps> = ({ 
  onShowDialog, 
  onShowSpecialOrderDialog,
  totalItems 
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center text-sm text-muted-foreground">
        <Package className="h-4 w-4 mr-1" /> 
        {totalItems} {totalItems === 1 ? 'item' : 'items'} added
      </div>
      
      <div className="flex gap-2">
        <Button 
          onClick={onShowDialog} 
          size="sm" 
          variant="outline"
          className="text-sm px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-300"
        >
          Add Inventory Item
        </Button>
        
        <Button 
          onClick={onShowSpecialOrderDialog} 
          size="sm" 
          variant="outline"
          className="text-sm px-3 py-1 rounded-full font-medium bg-purple-100 text-purple-800 border border-purple-300"
        >
          <PlusCircle className="h-3 w-3 mr-1" />
          Special Order
        </Button>
      </div>
    </div>
  );
};
