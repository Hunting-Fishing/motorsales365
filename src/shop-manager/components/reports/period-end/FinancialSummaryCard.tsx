import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function FinancialSummaryCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className
}: FinancialSummaryCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val);
    }
    return val;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatValue(value)}</p>
        {(subtitle || trendValue) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cn(
                "flex items-center text-sm",
                trend === 'up' && "text-green-600",
                trend === 'down' && "text-red-600",
                trend === 'neutral' && "text-muted-foreground"
              )}>
                {trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                {trend === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
