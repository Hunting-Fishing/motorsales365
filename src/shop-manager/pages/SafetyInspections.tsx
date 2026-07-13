import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDailyInspections } from '@/hooks/useDailyInspections';
import { ClipboardCheck, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function SafetyInspections() {
  const { loading, inspections } = useDailyInspections();

  return (
    <>
      <Helmet>
        <title>Daily Shop Inspections | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Daily Shop Inspections
            </h1>
            <p className="text-muted-foreground mt-1">Track daily safety inspections</p>
          </div>
          <Button asChild>
            <Link to="/safety/inspections/new">
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Inspections Yet</h3>
              <p className="text-muted-foreground mb-4">Start your first daily inspection</p>
              <Button asChild>
                <Link to="/safety/inspections/new">Start Inspection</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inspections.map((inspection) => (
              <Card key={inspection.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {inspection.overall_status === 'pass' && <CheckCircle className="h-6 w-6 text-green-500" />}
                      {inspection.overall_status === 'pass_with_issues' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                      {inspection.overall_status === 'fail' && <XCircle className="h-6 w-6 text-red-500" />}
                      <div>
                        <p className="font-medium">{format(new Date(inspection.inspection_date), 'PPP')}</p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.inspector_name} • {inspection.shift || 'N/A'} shift
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(inspection.hazards_identified?.length || 0) > 0 && (
                        <Badge variant="secondary">{inspection.hazards_identified?.length} hazards</Badge>
                      )}
                      <Badge variant={inspection.overall_status === 'pass' ? 'default' : inspection.overall_status === 'fail' ? 'destructive' : 'secondary'}>
                        {inspection.overall_status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
