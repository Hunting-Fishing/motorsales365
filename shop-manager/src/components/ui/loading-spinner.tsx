import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-[3px]",
        xl: "h-12 w-12 border-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function LoadingSpinner({ className, size, label, ...props }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2" {...props}>
      <div 
        className={cn(spinnerVariants({ size }), "text-primary", className)}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}