import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const reportTypeColors = {
  daily: 'bg-blue-500/10 text-blue-500',
  weekly: 'bg-purple-500/10 text-purple-500',
  monthly: 'bg-green-500/10 text-green-500',
  inspection: 'bg-orange-500/10 text-orange-500',
};

export function EquipmentReportsList() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['equipment-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily/Weekly Reports</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No equipment reports found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Report #{report.report_number}</h3>
                      <Badge className={reportTypeColors[report.report_type as keyof typeof reportTypeColors]}>
                        {report.report_type}
                      </Badge>
                    </div>
                    {report.operator_name && (
                      <p className="text-sm text-muted-foreground">Operator: {report.operator_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Date: {format(new Date(report.report_date), 'MMM d, yyyy')}</span>
                      {report.shift && <span>Shift: {report.shift}</span>}
                      {report.hours_used && <span>Hours: {report.hours_used}</span>}
                    </div>
                    {report.maintenance_needed && (
                      <Badge variant="destructive" className="mt-2">
                        Maintenance Needed
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
