import React from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  Clock, 
  Package, 
  TrendingUp,
  Users,
  Calendar,
  Wrench,
  CheckCircle2
} from 'lucide-react';

interface WorkOrderStatsCardsProps {
  workOrder: WorkOrder;
  jobLines?: WorkOrderJobLine[];
  parts?: WorkOrderPart[];
  timeEntries?: any[];
}

export function WorkOrderStatsCards({ 
  workOrder, 
  jobLines = [], 
  parts = [], 
  timeEntries = [] 
}: WorkOrderStatsCardsProps) {
  // Calculate statistics
  const totalCost = React.useMemo(() => {
    const laborCost = jobLines?.reduce((sum, line) => sum + (line.total_amount || 0), 0) || 0;
    const partsCost = parts?.reduce((sum, part) => sum + ((part.quantity || 0) * (part.unit_price || 0)), 0) || 0;
    return laborCost + partsCost;
  }, [jobLines, parts]);

  const totalLaborHours = React.useMemo(() => {
    return jobLines?.reduce((sum, line) => {
      return sum + (line.estimated_hours || 0);
    }, 0) || 0;
  }, [jobLines]);

  const partsCount = parts?.length || 0;
  
  const completionPercentage = React.useMemo(() => {
    const statusMap: { [key: string]: number } = {
      'draft': 0,
      'pending': 10,
      'scheduled': 20,
      'in_progress': 50,
      'awaiting_parts': 40,
      'quality_check': 80,
      'completed': 100,
      'cancelled': 0,
      'on_hold': 30
    };
    return statusMap[workOrder.status] || 0;
  }, [workOrder.status]);

  const stats = [
    {
      title: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      subtitle: 'Labor + Parts',
      icon: DollarSign,
      color: 'emerald' as const,
      trend: totalCost > 500 ? '+12%' : null
    },
    {
      title: 'Labor Hours',
      value: totalLaborHours.toFixed(1),
      subtitle: `${jobLines.length} job lines`,
      icon: Clock,
      color: 'blue' as const,
      trend: totalLaborHours > 8 ? 'High' : null
    },
    {
      title: 'Parts Used',
      value: partsCount.toString(),
      subtitle: `${parts.filter(p => p.status === 'installed').length} installed`,
      icon: Package,
      color: 'purple' as const,
      trend: null
    },
    {
      title: 'Progress',
      value: `${completionPercentage}%`,
      subtitle: workOrder.status.replace('_', ' '),
      icon: TrendingUp,
      color: 'orange' as const,
      trend: completionPercentage > 50 ? 'On Track' : null,
      showProgress: true
    }
  ];

  const colorVariants = {
    emerald: {
      bg: 'from-emerald-50/50 to-emerald-100/30',
      icon: 'bg-emerald-500',
      border: 'border-emerald-200/40'
    },
    blue: {
      bg: 'from-blue-50/50 to-blue-100/30',
      icon: 'bg-blue-500',
      border: 'border-blue-200/40'
    },
    purple: {
      bg: 'from-purple-50/50 to-purple-100/30',
      icon: 'bg-purple-500',
      border: 'border-purple-200/40'
    },
    orange: {
      bg: 'from-orange-50/50 to-orange-100/30',
      icon: 'bg-orange-500',
      border: 'border-orange-200/40'
    }
  };

  return (
    <div className="work-order-stats-grid mb-10">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colors = colorVariants[stat.color];
        
        return (
          <div 
            key={stat.title}
            className={`work-order-stat-card p-6 border ${colors.border} hover:shadow-lg transition-all duration-500 group bg-gradient-to-br ${colors.bg}`}
            style={{ 
              animationDelay: `${index * 150}ms`
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className={`${colors.icon} p-3 rounded-2xl shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              {stat.trend && (
                <span className="text-xs font-semibold text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full border border-border/50">
                  {stat.trend}
                </span>
              )}
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <p className="text-3xl font-bold text-foreground font-heading tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.subtitle}
              </p>
            </div>

            {/* Progress bar for completion percentage */}
            {stat.showProgress && (
              <div className="mt-6 space-y-2">
                <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${colors.icon} h-2 rounded-full transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${completionPercentage}%`,
                      transitionDelay: `${index * 200 + 300}ms`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Started</span>
                  <span>Complete</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}