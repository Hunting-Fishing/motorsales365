import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type GYRStatus = 1 | 2 | 3; // 1=Red, 2=Yellow, 3=Green

interface GYRSelectorProps {
  value: GYRStatus;
  onChange: (value: GYRStatus) => void;
  disabled?: boolean;
}

export function GYRSelector({ value, onChange, disabled }: GYRSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(3)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
          "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
          value === 3
            ? "bg-green-500 text-white border-green-600 shadow-md"
            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>OK</span>
      </button>
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(2)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
          "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
          value === 2
            ? "bg-yellow-500 text-white border-yellow-600 shadow-md"
            : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-900",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        <span>Attention</span>
      </button>
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(1)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
          "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
          value === 1
            ? "bg-red-500 text-white border-red-600 shadow-md"
            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <XCircle className="h-4 w-4" />
        <span>Urgent</span>
      </button>
    </div>
  );
}

export function GYRLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-muted-foreground">Green = OK</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="text-muted-foreground">Yellow = Needs Attention</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span className="text-muted-foreground">Red = Urgent Issue</span>
      </div>
    </div>
  );
}
