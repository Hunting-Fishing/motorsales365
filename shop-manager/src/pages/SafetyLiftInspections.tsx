import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLiftInspections } from '@/hooks/useLiftInspections';
import { Wrench, Plus, CheckCircle, XCircle, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function SafetyLiftInspections() {
  const { loading, inspections } = useLiftInspections();

  return (
    <>
      <Helmet>
        <title>Lift & Hoist Inspections | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wrench className="h-8 w-8 text-primary" />
              Lift & Hoist Inspections
            </h1>
            <p className="text-muted-foreground mt-1">Equipment safety inspections</p>
          </div>
          <Button asChild>
            <Link to="/safety/equipment/inspect">
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
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Inspections Yet</h3>
              <p className="text-muted-foreground mb-4">Start your first equipment inspection</p>
              <Button asChild>
                <Link to="/safety/equipment/inspect">Start Inspection</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inspections.map((inspection) => (
              <Card key={inspection.id} className={inspection.locked_out ? 'border-red-200' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {inspection.locked_out ? (
                        <Lock className="h-6 w-6 text-red-500" />
                      ) : inspection.safe_for_use ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{inspection.equipment_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.equipment_type.replace(/_/g, ' ')} • {inspection.inspector_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inspection.inspection_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{inspection.inspection_type}</Badge>
                      <Badge variant={inspection.safe_for_use && !inspection.locked_out ? 'default' : 'destructive'}>
                        {inspection.locked_out ? 'Locked Out' : inspection.safe_for_use ? 'Safe' : 'Unsafe'}
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
