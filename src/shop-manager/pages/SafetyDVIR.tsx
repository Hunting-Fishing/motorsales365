import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDVIR } from '@/hooks/useDVIR';
import { Truck, Plus, CheckCircle, XCircle, Wrench, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function SafetyDVIR() {
  const navigate = useNavigate();
  const { loading, dvirReports } = useDVIR();

  return (
    <>
      <Helmet>
        <title>DVIR Reports | Safety</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              Driver Vehicle Inspection Reports
            </h1>
            <p className="text-muted-foreground mt-1">Pre-trip and post-trip inspections</p>
          </div>
          <Button asChild>
            <Link to="/safety/dvir/new">
              <Plus className="h-4 w-4 mr-2" />
              New DVIR
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : dvirReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No DVIR Reports</h3>
              <p className="text-muted-foreground mb-4">Start your first vehicle inspection</p>
              <Button asChild>
                <Link to="/safety/dvir/new">Create DVIR</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {dvirReports.map((report) => (
              <Card 
                key={report.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/safety/dvir/${report.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {report.vehicle_safe_to_operate ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{report.inspection_type.replace('_', '-')} Inspection</p>
                        <p className="text-sm text-muted-foreground">
                          {report.driver_name} • {format(new Date(report.inspection_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.mechanic_review_required && !report.mechanic_reviewed_by && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          Review Needed
                        </Badge>
                      )}
                      <Badge variant={report.vehicle_safe_to_operate ? 'default' : 'destructive'}>
                        {report.vehicle_safe_to_operate ? 'Safe' : 'Not Safe'}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
