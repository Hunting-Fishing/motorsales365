
import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical" | "responsive";
  spacing?: "none" | "xs" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
}

export function ResponsiveStack({
  children,
  className,
  direction = "responsive",
  spacing = "md",
  align = "start",
  justify = "start",
}: ResponsiveStackProps) {
  // Calculate layout classes
  const directionClasses = {
    "horizontal": "flex flex-row",
    "vertical": "flex flex-col",
    "responsive": "flex flex-col md:flex-row",
  };
  
  const spacingClasses = {
    "none": "gap-0",
    "xs": "gap-2",
    "sm": "gap-4",
    "md": "gap-6",
    "lg": "gap-8",
  };
  
  const alignClasses = {
    "start": "items-start",
    "center": "items-center",
    "end": "items-end",
    "stretch": "items-stretch",
  };
  
  const justifyClasses = {
    "start": "justify-start",
    "center": "justify-center",
    "end": "justify-end",
    "between": "justify-between",
    "around": "justify-around",
  };
  
  return (
    <div
      className={cn(
        directionClasses[direction],
        spacingClasses[spacing],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  );
}
