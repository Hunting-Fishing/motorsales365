
import React from 'react';
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className,
  loading = false
}) => {
  return (
    <Card className={cn("overflow-hidden border-t-4 border-t-blue-500 hover:shadow-lg transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md mb-2"></div>
            ) : (
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            )}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            
            {trend && !loading && (
              <div className={cn(
                "text-xs font-medium flex items-center mt-2",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                <span className={cn(
                  "mr-1 rounded-full p-1",
                  trend.isPositive ? "bg-green-100" : "bg-red-100"
                )}>
                  {trend.isPositive ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L20 12L16 12L16 20L8 20L8 12L4 12L12 4Z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 20L4 12L8 12L8 4L16 4L16 12L20 12L12 20Z" fill="currentColor" />
                    </svg>
                  )}
                </span>
                {trend.value}% {trend.isPositive ? "increase" : "decrease"}
              </div>
            )}
          </div>
          
          {icon && (
            <div className="p-2 bg-blue-100 dark:bg-slate-800 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
