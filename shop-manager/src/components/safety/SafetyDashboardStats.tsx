import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Shield, 
  ClipboardCheck, 
  Award, 
  Truck,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { SafetyDashboardStats as Stats } from '@/types/safety';

interface SafetyDashboardStatsProps {
  stats: Stats;
  loading: boolean;
}

export function SafetyDashboardStats({ stats, loading }: SafetyDashboardStatsProps) {
  const cards = [
    {
      title: 'Open Incidents',
      value: stats.openIncidents,
      subValue: stats.criticalIncidents > 0 ? `${stats.criticalIncidents} critical` : null,
      icon: AlertTriangle,
      color: stats.openIncidents > 0 ? 'text-destructive' : 'text-green-500',
      bgColor: stats.openIncidents > 0 ? 'bg-destructive/10' : 'bg-green-500/10'
    },
    {
      title: "Today's Inspections",
      value: `${stats.todayInspectionsCompleted}/${stats.todayInspectionsTotal}`,
      subValue: stats.todayInspectionsCompleted >= stats.todayInspectionsTotal ? 'Complete' : 'Pending',
      icon: stats.todayInspectionsCompleted >= stats.todayInspectionsTotal ? CheckCircle : ClipboardCheck,
      color: stats.todayInspectionsCompleted >= stats.todayInspectionsTotal ? 'text-green-500' : 'text-amber-500',
      bgColor: stats.todayInspectionsCompleted >= stats.todayInspectionsTotal ? 'bg-green-500/10' : 'bg-amber-500/10'
    },
    {
      title: 'Certificate Alerts',
      value: stats.expiringCertificates + stats.expiredCertificates,
      subValue: stats.expiredCertificates > 0 ? `${stats.expiredCertificates} expired` : `${stats.expiringCertificates} expiring`,
      icon: Award,
      color: stats.expiredCertificates > 0 ? 'text-destructive' : stats.expiringCertificates > 0 ? 'text-amber-500' : 'text-green-500',
      bgColor: stats.expiredCertificates > 0 ? 'bg-destructive/10' : stats.expiringCertificates > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'
    },
    {
      title: 'Equipment Status',
      value: stats.unsafeEquipment,
      subValue: stats.unsafeEquipment > 0 ? 'Out of Service' : 'All Safe',
      icon: stats.unsafeEquipment > 0 ? XCircle : Shield,
      color: stats.unsafeEquipment > 0 ? 'text-destructive' : 'text-green-500',
      bgColor: stats.unsafeEquipment > 0 ? 'bg-destructive/10' : 'bg-green-500/10'
    },
    {
      title: 'Pending DVIR Reviews',
      value: stats.pendingDVIRs,
      subValue: stats.pendingDVIRs > 0 ? 'Need Review' : 'All Reviewed',
      icon: Truck,
      color: stats.pendingDVIRs > 0 ? 'text-amber-500' : 'text-green-500',
      bgColor: stats.pendingDVIRs > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
                {card.subValue && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subValue}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
