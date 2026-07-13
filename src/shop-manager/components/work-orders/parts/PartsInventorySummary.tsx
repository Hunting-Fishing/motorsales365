
import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, DollarSign, TrendingUp } from 'lucide-react';

interface PartsInventorySummaryProps {
  parts: WorkOrderPart[];
}

export function PartsInventorySummary({ parts }: PartsInventorySummaryProps) {
  const totalParts = parts.length;
  const totalValue = parts.reduce((sum, part) => sum + (part.total_price || 0), 0);
  const avgPartValue = totalParts > 0 ? totalValue / totalParts : 0;

  const statusCounts = parts.reduce((acc, part) => {
    const status = part.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Parts Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalParts}</div>
            <div className="text-sm text-muted-foreground">Total Parts</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${totalValue.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${avgPartValue.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Part Value</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {statusCounts.installed || 0}
            </div>
            <div className="text-sm text-muted-foreground">Installed</div>
          </div>
        </div>

        {Object.keys(statusCounts).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Parts by Status:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {status}: {count}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
