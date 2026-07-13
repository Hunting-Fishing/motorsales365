import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props { metrics: any; loading: boolean; }

export function InspectionReportsTab({ metrics, loading }: Props) {
  if (loading) return <Card><CardContent className="py-12 text-center">Loading...</CardContent></Card>;
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Inspection Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-2xl font-bold">{metrics?.totalInspections || 0}</p><p className="text-sm text-muted-foreground">Total Inspections</p></div>
            <div><p className="text-2xl font-bold">{metrics?.passRate || 0}%</p><p className="text-sm text-muted-foreground">Pass Rate</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
