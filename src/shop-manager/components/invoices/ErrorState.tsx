
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-slate-500 max-w-sm mb-6">
        We couldn't load your invoices. Please try again or contact support if the problem persists.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      )}
    </div>
  );
};
