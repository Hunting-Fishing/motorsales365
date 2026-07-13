
import React from "react";

interface InventoryFormStatusProps {
  status: string;
}

export function InventoryFormStatus({ status }: InventoryFormStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800 border-green-300";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Out of Stock":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Status</p>
      <div className="flex items-center">
        <span className={`text-sm px-3 py-1 rounded-full font-medium border ${getStatusColor()}`}>
          {status}
        </span>
        <span className="ml-3 text-sm text-muted-foreground">
          Status is determined automatically based on quantity and reorder point
        </span>
      </div>
    </div>
  );
}
