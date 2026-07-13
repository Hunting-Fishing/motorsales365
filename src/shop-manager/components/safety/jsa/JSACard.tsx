import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobSafetyAnalysis } from '@/hooks/useJobSafetyAnalysis';
import { Calendar, MapPin, User, Shield, ChevronRight, AlertTriangle } from 'lucide-react';

interface JSACardProps {
  jsa: JobSafetyAnalysis;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function JSACard({ jsa, onClick }: JSACardProps) {
  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {jsa.jsa_number}
              </Badge>
              <Badge className={statusColors[jsa.status]}>
                {jsa.status.replace('_', ' ')}
              </Badge>
              {jsa.overall_risk_level && (
                <Badge variant="outline" className={riskColors[jsa.overall_risk_level]}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {jsa.overall_risk_level}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base">{jsa.job_title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(jsa.date_performed), 'MMM d, yyyy')}
          </div>
          {jsa.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {jsa.location}
            </div>
          )}
          {jsa.supervisor_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {jsa.supervisor_name}
            </div>
          )}
        </div>

        {jsa.required_ppe && jsa.required_ppe.length > 0 && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {jsa.required_ppe.slice(0, 4).map((ppe, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ppe}
                </Badge>
              ))}
              {jsa.required_ppe.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{jsa.required_ppe.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {jsa.job_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {jsa.job_description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
