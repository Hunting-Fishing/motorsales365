import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { SafetyIncident } from '@/types/safety';
import { INCIDENT_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/types/safety';
import { useNavigate } from 'react-router-dom';

interface RecentIncidentsListProps {
  incidents: SafetyIncident[];
  loading: boolean;
}

const severityColors: Record<string, string> = {
  minor: 'bg-blue-500/10 text-blue-600 border-blue-200',
  moderate: 'bg-amber-500/10 text-amber-600 border-amber-200',
  serious: 'bg-orange-500/10 text-orange-600 border-orange-200',
  critical: 'bg-destructive/10 text-destructive border-destructive/30'
};

const statusColors: Record<string, string> = {
  open: 'bg-destructive/10 text-destructive',
  under_investigation: 'bg-amber-500/10 text-amber-600',
  resolved: 'bg-green-500/10 text-green-600',
  closed: 'bg-muted text-muted-foreground'
};

export function RecentIncidentsList({ incidents, loading }: RecentIncidentsListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Recent Incidents
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/safety/incidents')}
        >
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No open incidents</p>
            <p className="text-sm">Great job maintaining safety!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <div 
                key={incident.id} 
                className={`p-4 rounded-lg border ${severityColors[incident.severity]} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => navigate(`/safety/incidents/${incident.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={statusColors[incident.investigation_status]}>
                        {STATUS_LABELS[incident.investigation_status]}
                      </Badge>
                      <Badge variant="outline">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]}
                      </Badge>
                    </div>
                    <h4 className="font-medium">{incident.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {incident.description}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <Badge className={severityColors[incident.severity]}>
                      {SEVERITY_LABELS[incident.severity]}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      {format(new Date(incident.incident_date), 'MMM d')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
