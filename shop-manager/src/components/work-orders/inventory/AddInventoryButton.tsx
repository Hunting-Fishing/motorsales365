
import React from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AddInventoryButtonProps {
  onShowDialog: () => void;
  disabled?: boolean;
}

export const AddInventoryButton: React.FC<AddInventoryButtonProps> = ({ 
  onShowDialog,
  disabled = false 
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={onShowDialog}
            disabled={disabled}
          >
            <Package className="h-4 w-4" />
            Add Inventory Item
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add parts and materials from inventory</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
