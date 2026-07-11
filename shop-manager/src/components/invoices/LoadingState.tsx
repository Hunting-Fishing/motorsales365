
import React from 'react';
import { Loader2 } from "lucide-react";

export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-semibold">Loading invoices...</h3>
    </div>
  );
};
