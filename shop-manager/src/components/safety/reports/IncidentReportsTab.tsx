import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { IncidentMetrics } from '@/hooks/useSafetyReports';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  metrics: IncidentMetrics | null;
  loading: boolean;
}

const SEVERITY_COLORS = {
  minor: '#22c55e',
  moderate: '#f59e0b',
  serious: '#f97316',
  critical: '#ef4444',
  unknown: '#6b7280'
};

export function IncidentReportsTab({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const severityData = metrics?.incidentsBySeverity?.map(item => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: item.count,
    color: SEVERITY_COLORS[item.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.unknown
  })) || [];

  return (
    <div className="space-y-6">
      {/* OSHA Recordable Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            OSHA Incident Frequency Rates
          </CardTitle>
          <CardDescription>
            Industry-standard safety metrics based on 200,000 work hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-3xl font-bold text-orange-600">{metrics?.trir?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        TRIR <Info className="h-3 w-3" />
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Recordable Incident Rate</p>
                    <p className="text-xs text-muted-foreground">Formula: (Incidents × 200,000) / Hours Worked</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-3xl font-bold text-blue-600">{metrics?.dart || 0}</p>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        DART <Info className="h-3 w-3" />
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Days Away, Restricted, or Transferred</p>
                    <p className="text-xs text-muted-foreground">Cases resulting in time off work</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-3xl font-bold text-purple-600">0.00</p>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        LTIR <Info className="h-3 w-3" />
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Lost Time Incident Rate</p>
                    <p className="text-xs text-muted-foreground">Incidents causing lost work time</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">{metrics?.totalIncidents || 0}</p>
              <p className="text-sm text-muted-foreground">Total Recordable</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend & Severity Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Incident Trend</CardTitle>
            <CardDescription>Incidents recorded over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.incidentsByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Severity</CardTitle>
            <CardDescription>Distribution of incident severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No incident data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OSHA 300 Log Format */}
      <Card>
        <CardHeader>
          <CardTitle>OSHA 300 Log Summary</CardTitle>
          <CardDescription>Injury and illness log format for regulatory compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident Type</TableHead>
                <TableHead className="text-center">Count</TableHead>
                <TableHead className="text-center">Death</TableHead>
                <TableHead className="text-center">Days Away</TableHead>
                <TableHead className="text-center">Job Transfer</TableHead>
                <TableHead className="text-center">Other Recordable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.incidentsByType?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium capitalize">{item.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-center">{item.count}</TableCell>
                  <TableCell className="text-center">0</TableCell>
                  <TableCell className="text-center">0</TableCell>
                  <TableCell className="text-center">0</TableCell>
                  <TableCell className="text-center">{item.count}</TableCell>
                </TableRow>
              ))}
              {(!metrics?.incidentsByType || metrics.incidentsByType.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No incidents recorded in this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
