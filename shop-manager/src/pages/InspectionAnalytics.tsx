import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InspectionAnalyticsCharts } from '@/components/safety/dashboard/InspectionAnalyticsCharts';
import { ServiceAlertsPanel } from '@/components/safety/dashboard/ServiceAlertsPanel';

export default function InspectionAnalytics() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Inspection Analytics | Safety</title>
        <meta name="description" content="View inspection statistics, trends, and service alerts" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/safety')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Inspection Analytics
            </h1>
            <p className="text-muted-foreground">
              View inspection trends, statistics, and service alerts
            </p>
          </div>
        </div>

        {/* Analytics Charts */}
        <InspectionAnalyticsCharts />

        {/* Service Alerts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ServiceAlertsPanel />
          
          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/safety/vessels')}
              >
                Start Vessel Inspection
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/safety/equipment/forklift')}
              >
                Start Forklift Inspection
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/safety')}
              >
                View Safety Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
