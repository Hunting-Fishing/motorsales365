
import React from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function InventoryLoadingState() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-center items-center h-80">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}
