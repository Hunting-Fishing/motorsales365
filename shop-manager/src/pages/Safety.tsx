import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useSafetyDashboard } from '@/hooks/useSafetyDashboard';
import { useDailyInspections } from '@/hooks/useDailyInspections';
import { useDVIR } from '@/hooks/useDVIR';
import { useLiftInspections } from '@/hooks/useLiftInspections';
import {
  SafetyDashboardStats,
  RecentIncidentsList,
  TodayInspectionsCard,
  UnsafeEquipmentAlert,
  SafetyQuickActions,
  CertificationAlertsCard,
  InspectionCompletionWidget,
  TodaysHazardsWidget,
  FlaggedVehiclesCard,
  CriticalDefectsCard
} from '@/components/safety';
import { ServiceAlertsPanel } from '@/components/safety/dashboard/ServiceAlertsPanel';
import { CorrectiveActionsWidget } from '@/components/safety/dashboard/CorrectiveActionsWidget';
import { NearMissWidget } from '@/components/safety/dashboard/NearMissWidget';
import { TrainingComplianceWidget } from '@/components/safety/dashboard/TrainingComplianceWidget';
import { ComplianceScoreWidget } from '@/components/safety/dashboard/ComplianceScoreWidget';
import { EquipmentHealthWidget } from '@/components/safety/dashboard/EquipmentHealthWidget';
import { UpcomingInspectionsWidget } from '@/components/safety/dashboard/UpcomingInspectionsWidget';
import { Shield, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Safety() {
  const navigate = useNavigate();
  const { loading, stats, recentIncidents, todayInspections, unsafeLifts, refetch } = useSafetyDashboard();
  const { inspections, loading: inspectionsLoading } = useDailyInspections();
  const { dvirReports, loading: dvirLoading } = useDVIR();
  const { inspections: liftInspections, loading: liftLoading } = useLiftInspections();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <Helmet>
        <title>Safety Dashboard | Shop Management</title>
        <meta name="description" content="Real-time safety compliance dashboard - track incidents, inspections, certifications, and equipment status" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Safety & Compliance
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time safety monitoring and compliance tracking
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="default"
            onClick={() => navigate('/safety/analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>

        {/* Stats Overview */}
        <SafetyDashboardStats stats={stats} loading={loading} />

        {/* Quick Actions */}
        <SafetyQuickActions />

        {/* Critical Alerts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CriticalDefectsCard 
            liftInspections={liftInspections} 
            dvirReports={dvirReports} 
            loading={liftLoading || dvirLoading} 
          />
          <FlaggedVehiclesCard 
            dvirReports={dvirReports} 
            loading={dvirLoading} 
          />
        </div>

        {/* CAPA & Training Row */}
        <div className="grid gap-6 lg:grid-cols-4">
          <ComplianceScoreWidget />
          <CorrectiveActionsWidget />
          <NearMissWidget />
          <TrainingComplianceWidget />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6">
            <EquipmentHealthWidget />
            <InspectionCompletionWidget 
              inspections={inspections} 
              loading={inspectionsLoading} 
            />
            <TodaysHazardsWidget 
              inspections={inspections} 
              loading={inspectionsLoading} 
            />
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            <UpcomingInspectionsWidget />
            <RecentIncidentsList incidents={recentIncidents} loading={loading} />
            <TodayInspectionsCard inspections={todayInspections} loading={loading} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ServiceAlertsPanel />
            <UnsafeEquipmentAlert unsafeLifts={unsafeLifts} loading={loading} />
            <CertificationAlertsCard />
          </div>
        </div>
      </div>
    </>
  );
}
