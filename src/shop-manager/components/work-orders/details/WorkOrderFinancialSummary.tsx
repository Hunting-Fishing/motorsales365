
import React from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkOrderFinancialSummaryProps {
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  timeLogged: number;
}

export function WorkOrderFinancialSummary({
  jobLines,
  allParts,
  timeLogged
}: WorkOrderFinancialSummaryProps) {
  // Calculate financial totals
  const laborTotal = jobLines?.reduce((sum, line) => sum + (line.total_amount || 0), 0) || 0;
  const partsTotal = allParts?.reduce((sum, part) => sum + (part.total_price || 0), 0) || 0;
  const estimatedHours = jobLines?.reduce((sum, line) => sum + (line.estimated_hours || 0), 0) || 0;
  const grandTotal = laborTotal + partsTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Labor Total</p>
            <p className="text-2xl font-bold">${laborTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Parts Total</p>
            <p className="text-2xl font-bold">${partsTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Estimated Hours</p>
            <p className="text-2xl font-bold">{estimatedHours.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Time Logged</p>
            <p className="text-2xl font-bold">{timeLogged.toFixed(1)}h</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="text-3xl font-bold text-green-600">${grandTotal.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
