import React from 'react';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceTypeDistributionChart } from '@/components/dashboard/ServiceTypeDistributionChart';
import { TechnicianPerformanceChart } from '@/components/dashboard/TechnicianPerformanceChart';
import { WorkOrderPhaseProgress } from '@/components/dashboard/WorkOrderPhaseProgress';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { EquipmentRecommendations } from '@/components/dashboard/EquipmentRecommendations';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { useDashboardData } from '@/hooks/useDashboardData';

interface CustomizableDashboardProps {
  layout?: 'compact' | 'detailed' | 'executive';
}

export function CustomizableDashboard({ layout = 'detailed' }: CustomizableDashboardProps) {
  const { getEnabledWidgets } = useDashboardPreferences();
  const { phaseProgressData, isLoading } = useDashboardData();
  
  const enabledWidgets = getEnabledWidgets();

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'statsCards':
        return <StatsCards key={widgetId} />;
      case 'revenueChart':
        return <RevenueChart key={widgetId} />;
      case 'serviceDistribution':
        return <ServiceTypeDistributionChart key={widgetId} />;
      case 'technicianPerformance':
        return <TechnicianPerformanceChart key={widgetId} />;
      case 'workOrderProgress':
        return (
          <WorkOrderPhaseProgress 
            key={widgetId}
            data={phaseProgressData} 
            isLoading={isLoading} 
          />
        );
      case 'todaySchedule':
        return <TodaySchedule key={widgetId} />;
      case 'equipmentRecommendations':
        return <EquipmentRecommendations key={widgetId} />;
      case 'dashboardAlerts':
        return <DashboardAlerts key={widgetId} />;
      default:
        return null;
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'compact':
        return 'space-y-4';
      case 'executive':
        return 'space-y-8';
      default:
        return 'space-y-6';
    }
  };

  const getGridClasses = (widgetId: string) => {
    const isChartsRow = ['revenueChart', 'serviceDistribution'].includes(widgetId);
    const isTechnicianRow = ['technicianPerformance', 'workOrderProgress'].includes(widgetId);
    const isScheduleRow = ['todaySchedule', 'equipmentRecommendations'].includes(widgetId);

    if (layout === 'compact') {
      if (isChartsRow || isScheduleRow) {
        return 'grid grid-cols-1 lg:grid-cols-2 gap-4';
      }
      if (isTechnicianRow) {
        return 'grid grid-cols-1 lg:grid-cols-3 gap-4';
      }
      return '';
    }

    if (layout === 'executive') {
      if (isChartsRow) {
        return 'grid grid-cols-1 xl:grid-cols-2 gap-8';
      }
      return '';
    }

    // Default detailed layout
    if (isChartsRow) {
      return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
    }
    if (isTechnicianRow) {
      return 'grid grid-cols-1 lg:grid-cols-3 gap-6';
    }
    if (isScheduleRow) {
      return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
    }
    return '';
  };

  const groupWidgets = () => {
    const groups: { [key: string]: string[] } = {
      charts: ['revenueChart', 'serviceDistribution'],
      performance: ['technicianPerformance', 'workOrderProgress'],
      schedule: ['todaySchedule', 'equipmentRecommendations'],
    };

    const grouped: JSX.Element[] = [];
    const processedWidgets = new Set<string>();

    enabledWidgets.forEach(widget => {
      if (processedWidgets.has(widget.id)) return;

      // Check if this widget belongs to a group
      const groupKey = Object.keys(groups).find(key => 
        groups[key].includes(widget.id)
      );

      if (groupKey) {
        // Find all enabled widgets in this group
        const groupWidgets = groups[groupKey].filter(id => 
          enabledWidgets.some(w => w.id === id && !processedWidgets.has(id))
        );

        if (groupWidgets.length > 1) {
          // Render as a group
          grouped.push(
            <div key={groupKey} className={getGridClasses(widget.id)}>
              {groupWidgets.map(id => {
                processedWidgets.add(id);
                if (id === 'technicianPerformance') {
                  return (
                    <div key={id} className="lg:col-span-2">
                      {renderWidget(id)}
                    </div>
                  );
                }
                return renderWidget(id);
              })}
            </div>
          );
        } else {
          // Single widget in group, render normally
          processedWidgets.add(widget.id);
          grouped.push(renderWidget(widget.id)!);
        }
      } else {
        // Standalone widget
        processedWidgets.add(widget.id);
        grouped.push(renderWidget(widget.id)!);
      }
    });

    return grouped;
  };

  return (
    <div className={getLayoutClasses()}>
      {groupWidgets()}
    </div>
  );
}