import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter,
  Clock,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useSafetyIncidents } from '@/hooks/useSafetyIncidents';
import { 
  INCIDENT_TYPE_LABELS, 
  SEVERITY_LABELS, 
  STATUS_LABELS,
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

export default function SafetyIncidents() {
  const navigate = useNavigate();
  const { incidents, loading } = useSafetyIncidents();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(search.toLowerCase()) ||
      incident.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || incident.investigation_status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const openCount = incidents.filter(i => i.investigation_status === 'open').length;
  const investigatingCount = incidents.filter(i => i.investigation_status === 'under_investigation').length;
  const resolvedCount = incidents.filter(i => i.investigation_status === 'resolved' || i.investigation_status === 'closed').length;

  return (
    <>
      <Helmet>
        <title>Safety Incidents | Shop Management</title>
        <meta name="description" content="Track and manage safety incidents, injuries, and near-misses" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/safety')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                Safety Incidents
              </h1>
              <p className="text-muted-foreground mt-1">
                Track and manage incidents, injuries, and near-misses
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/safety/incidents/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{openCount}</div>
              <p className="text-sm text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{investigatingCount}</div>
              <p className="text-sm text-muted-foreground">Investigating</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search incidents..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvestigationStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <CardTitle>Incidents ({filteredIncidents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No incidents found</p>
                {search || statusFilter !== 'all' || severityFilter !== 'all' ? (
                  <p className="text-sm">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm">Great job maintaining safety!</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className={`p-4 rounded-lg border ${severityColors[incident.severity]} cursor-pointer hover:shadow-md transition-all`}
                    onClick={() => navigate(`/safety/incidents/${incident.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={statusColors[incident.investigation_status]}>
                            {STATUS_LABELS[incident.investigation_status]}
                          </Badge>
                          <Badge variant="outline">
                            {INCIDENT_TYPE_LABELS[incident.incident_type]}
                          </Badge>
                          {incident.osha_reportable && (
                            <Badge variant="destructive" className="text-xs">OSHA</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {incident.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(incident.incident_date), 'MMM d, yyyy')}
                          </span>
                          <span>{incident.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={severityColors[incident.severity]}>
                          {SEVERITY_LABELS[incident.severity]}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
