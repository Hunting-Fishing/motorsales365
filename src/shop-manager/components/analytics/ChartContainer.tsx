
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function ChartContainer({
  title,
  description,
  children,
  className = "",
  isLoading = false
}: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] w-full bg-slate-50 rounded-md animate-pulse">
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
