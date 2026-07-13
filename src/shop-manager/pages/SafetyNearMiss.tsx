import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Plus, Search, RefreshCw, AlertTriangle, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { useNearMissReports, NearMissReport } from '@/hooks/useNearMissReports';
import { NearMissReportDialog } from '@/components/safety/near-miss/NearMissReportDialog';
import { NearMissCard } from '@/components/safety/near-miss/NearMissCard';
import { NearMissTrendChart } from '@/components/safety/near-miss/NearMissTrendChart';

export default function SafetyNearMiss() {
  const { loading, reports, totalThisMonth, pendingReview, createReport, updateReport, refetch } = useNearMissReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<NearMissReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || report.potential_severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleEdit = (report: NearMissReport) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<NearMissReport>) => {
    if (selectedReport) {
      await updateReport(selectedReport.id, data);
    } else {
      await createReport(data);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Near Miss Reports | Safety Management</title>
        <meta name="description" content="Report and track near miss incidents to prevent future accidents" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              Near Miss Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Report close calls to prevent future incidents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Report Near Miss
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalThisMonth}</div>
              <p className="text-xs text-muted-foreground">Near misses reported</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReview}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.filter(r => r.potential_severity === 'serious' || r.potential_severity === 'catastrophic').length}
              </div>
              <p className="text-xs text-muted-foreground">Serious or catastrophic</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Reports and Analytics */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="action_required">Action Required</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                      <SelectItem value="catastrophic">Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading near miss reports...
                  </CardContent>
                </Card>
              ) : filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No near miss reports found
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map(report => (
                  <NearMissCard
                    key={report.id}
                    report={report}
                    onEdit={() => handleEdit(report)}
                    onStatusChange={(status) => updateReport(report.id, { status: status as 'reported' | 'reviewed' | 'action_required' | 'closed' })}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <NearMissTrendChart reports={reports} />
          </TabsContent>
        </Tabs>
      </div>

      <NearMissReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={selectedReport}
        onSave={handleSave}
      />
    </>
  );
}
