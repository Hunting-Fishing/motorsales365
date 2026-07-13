import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wrench, AlertTriangle, Clock, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FleetHealthOverview } from '@/components/equipment-dashboard/FleetHealthOverview';
import { EquipmentStatusChart } from '@/components/equipment-dashboard/EquipmentStatusChart';
import { MaintenanceCostTrends } from '@/components/equipment-dashboard/MaintenanceCostTrends';
import { UpcomingMaintenanceWidget } from '@/components/equipment-dashboard/UpcomingMaintenanceWidget';
import { EquipmentAlertsPanel } from '@/components/equipment-dashboard/EquipmentAlertsPanel';

export default function EquipmentDashboard() {
  const navigate = useNavigate();

  const { data: equipmentStats, isLoading } = useQuery({
    queryKey: ['equipment-dashboard-stats'],
    queryFn: async () => {
      const { data: equipment, error } = await supabase
        .from('equipment_assets')
        .select('id, status, current_hours, current_mileage, purchase_cost, next_service_date');
      
      if (error) throw error;

      const total = equipment?.length || 0;
      const operational = equipment?.filter(e => e.status === 'operational').length || 0;
      const maintenance = equipment?.filter(e => e.status === 'maintenance').length || 0;
      const outOfService = equipment?.filter(e => e.status === 'down' || e.status === 'retired').length || 0;

      const totalHours = equipment?.reduce((sum, e) => sum + (e.current_hours || 0), 0) || 0;
      const avgHours = total > 0 ? Math.round(totalHours / total) : 0;

      const totalValue = equipment?.reduce((sum, e) => sum + (e.purchase_cost || 0), 0) || 0;

      const upcomingMaintenance = equipment?.filter(e => {
        if (!e.next_service_date) return false;
        const nextDate = new Date(e.next_service_date);
        const now = new Date();
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 14;
      }).length || 0;

      return {
        total,
        operational,
        maintenance,
        outOfService,
        avgHours,
        totalValue,
        upcomingMaintenance,
        operationalRate: total > 0 ? Math.round((operational / total) * 100) : 0
      };
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipment Dashboard</h1>
            <p className="text-muted-foreground">Fleet health overview and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/equipment')}>
            <Wrench className="h-4 w-4 mr-2" />
            View All Equipment
          </Button>
        </div>
      </div>

      {/* Fleet Health Overview */}
      <FleetHealthOverview stats={equipmentStats} isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EquipmentStatusChart />
        <MaintenanceCostTrends />
      </div>

      {/* Alerts and Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingMaintenanceWidget />
        <EquipmentAlertsPanel />
      </div>
    </div>
  );
}
