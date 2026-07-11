import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Clock, User } from 'lucide-react';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';
import { VoyageLog, VoyageIncident, IncidentType, INCIDENT_TYPE_LABELS } from '@/types/voyage';
import { format } from 'date-fns';

interface IncidentReportProps {
  voyage: VoyageLog;
}

export function IncidentReport({ voyage }: IncidentReportProps) {
  const { updateVoyage, isUpdating } = useVoyageLogs();
  const [incidentType, setIncidentType] = useState<IncidentType>('other');
  const [severity, setSeverity] = useState<VoyageIncident['severity']>('low');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [reportedBy, setReportedBy] = useState('');

  const incidents = voyage.incidents || [];

  const addIncident = async () => {
    if (!description.trim()) return;

    const newIncident: VoyageIncident = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: incidentType,
      severity,
      description: description.trim(),
      resolution: resolution.trim() || undefined,
      reported_by: reportedBy.trim() || undefined
    };

    await updateVoyage({
      id: voyage.id,
      incidents: [...incidents, newIncident],
      has_incidents: true
    });

    setDescription('');
    setResolution('');
    setReportedBy('');
    setIncidentType('other');
    setSeverity('low');
  };

  const getSeverityVariant = (sev: VoyageIncident['severity']) => {
    switch (sev) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityColor = (sev: VoyageIncident['severity']) => {
    switch (sev) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Incident Form */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Report Incident / Problem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Incident Type</Label>
                <Select value={incidentType} onValueChange={v => setIncidentType(v as IncidentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={v => setSeverity(v as VoyageIncident['severity'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reported By</Label>
                <Input 
                  value={reportedBy}
                  onChange={e => setReportedBy(e.target.value)}
                  placeholder="Name of reporter..."
                />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
              />
            </div>
            <div>
              <Label>Resolution / Action Taken</Label>
              <Textarea 
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="How was the issue resolved or what action was taken..."
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={addIncident} 
                disabled={!description.trim() || isUpdating}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Report Incident
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Incident Log
            {incidents.length > 0 && (
              <Badge variant="destructive">{incidents.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No incidents reported</p>
          ) : (
            <div className="space-y-4">
              {[...incidents].reverse().map(incident => (
                <div key={incident.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(incident.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{INCIDENT_TYPE_LABELS[incident.type]}</Badge>
                        <Badge variant={getSeverityVariant(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-2">{incident.description}</p>
                      {incident.resolution && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Resolution:</strong> {incident.resolution}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(incident.timestamp), 'MMM d, HH:mm')}
                        </span>
                        {incident.reported_by && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {incident.reported_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
