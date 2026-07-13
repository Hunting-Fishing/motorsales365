import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User,
  FileText,
  CheckCircle2,
  Search,
  Shield,
  ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useSafetyIncidents } from '@/hooks/useSafetyIncidents';
import { 
  SafetyIncident,
  INCIDENT_TYPE_LABELS, 
  SEVERITY_LABELS, 
  STATUS_LABELS,
  INJURED_PERSON_TYPE_LABELS,
  InvestigationStatus
} from '@/types/safety';

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

export default function SafetyIncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, loading, updateIncidentStatus } = useSafetyIncidents();
  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Investigation form state
  const [rootCause, setRootCause] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [newStatus, setNewStatus] = useState<InvestigationStatus | ''>('');

  useEffect(() => {
    if (incidents.length > 0 && id) {
      const found = incidents.find(i => i.id === id);
      if (found) {
        setIncident(found);
        setRootCause(found.root_cause || '');
        setCorrectiveActions(found.corrective_actions || '');
        setPreventiveMeasures(found.preventive_measures || '');
        setNewStatus(found.investigation_status);
      }
    }
  }, [incidents, id]);

  const handleUpdateStatus = async () => {
    if (!incident || !newStatus) return;
    
    setUpdating(true);
    try {
      await updateIncidentStatus(incident.id, newStatus, {
        root_cause: rootCause || undefined,
        corrective_actions: correctiveActions || undefined,
        preventive_measures: preventiveMeasures || undefined
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto py-6 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p>Incident not found</p>
        <Button variant="link" onClick={() => navigate('/safety/incidents')}>
          Back to incidents
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{incident.title} | Safety Incident</title>
        <meta name="description" content={`Safety incident details: ${incident.title}`} />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/safety/incidents')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={statusColors[incident.investigation_status]}>
                {STATUS_LABELS[incident.investigation_status]}
              </Badge>
              <Badge className={severityColors[incident.severity]}>
                {SEVERITY_LABELS[incident.severity]}
              </Badge>
              {incident.osha_reportable && (
                <Badge variant="destructive">OSHA Reportable</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{incident.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(incident.incident_date), 'MMMM d, yyyy')}
                {incident.incident_time && ` at ${incident.incident_time}`}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {incident.location}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Incident Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{INCIDENT_TYPE_LABELS[incident.incident_type]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{incident.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Injury Information */}
            {incident.injured_person_name && (
              <Card className="border-amber-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <User className="h-5 w-5" />
                    Injury Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Injured Person</Label>
                      <p className="font-medium">{incident.injured_person_name}</p>
                    </div>
                    {incident.injured_person_type && (
                      <div>
                        <Label className="text-muted-foreground">Person Type</Label>
                        <p className="font-medium">
                          {INJURED_PERSON_TYPE_LABELS[incident.injured_person_type]}
                        </p>
                      </div>
                    )}
                  </div>
                  {incident.injury_details && (
                    <div>
                      <Label className="text-muted-foreground">Injury Details</Label>
                      <p className="mt-1">{incident.injury_details}</p>
                    </div>
                  )}
                  {incident.medical_treatment_required && (
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <p className="font-medium text-amber-600">Medical Treatment Required</p>
                      {incident.medical_treatment_description && (
                        <p className="text-sm mt-1">{incident.medical_treatment_description}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Investigation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Investigation
                </CardTitle>
                <CardDescription>
                  Document root cause analysis and corrective actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="root_cause">Root Cause Analysis</Label>
                  <Textarea
                    id="root_cause"
                    placeholder="What caused this incident to occur?"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrective">Corrective Actions</Label>
                  <Textarea
                    id="corrective"
                    placeholder="What immediate actions were taken?"
                    value={correctiveActions}
                    onChange={(e) => setCorrectiveActions(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preventive">Preventive Measures</Label>
                  <Textarea
                    id="preventive"
                    placeholder="What will prevent this from happening again?"
                    value={preventiveMeasures}
                    onChange={(e) => setPreventiveMeasures(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Update Status</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as InvestigationStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleUpdateStatus} 
                    disabled={updating || !newStatus}
                    className="mt-6"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium">Reported</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(incident.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  {incident.investigation_status !== 'open' && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Search className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">Under Investigation</p>
                        <p className="text-sm text-muted-foreground">Investigation started</p>
                      </div>
                    </div>
                  )}

                  {(incident.investigation_status === 'resolved' || incident.investigation_status === 'closed') && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Resolved</p>
                        {incident.resolved_at && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(incident.resolved_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Quick Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incident ID</span>
                  <span className="font-mono text-sm">{incident.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{INCIDENT_TYPE_LABELS[incident.incident_type]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <Badge className={severityColors[incident.severity]}>
                    {SEVERITY_LABELS[incident.severity]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OSHA Reportable</span>
                  <span>{incident.osha_reportable ? 'Yes' : 'No'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
