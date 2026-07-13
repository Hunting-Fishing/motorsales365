
import React from "react";
import { Button } from "@/components/ui/button";

interface InventoryFormActionsProps {
  loading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  showSpecialOrderButton?: boolean;
  onSpecialOrder?: () => void;
}

export function InventoryFormActions({
  loading,
  onCancel,
  submitLabel = "Save",
  showSpecialOrderButton = false,
  onSpecialOrder
}: InventoryFormActionsProps) {
  return (
    <div className="flex justify-center space-x-8 mt-6">
      <Button 
        type="submit" 
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-md"
      >
        {loading ? "Saving..." : submitLabel}
      </Button>
      
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel}
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-md border-none"
      >
        Cancel
      </Button>
      
      {showSpecialOrderButton && onSpecialOrder && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onSpecialOrder}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md border-none"
        >
          Create Special Order
        </Button>
      )}
    </div>
  );
}
