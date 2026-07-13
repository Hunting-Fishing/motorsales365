import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, TrendingUp, AlertTriangle, CheckCircle, Award, RefreshCw } from 'lucide-react';
import { useSafetyReports } from '@/hooks/useSafetyReports';
import { IncidentReportsTab } from '@/components/safety/reports/IncidentReportsTab';
import { InspectionReportsTab } from '@/components/safety/reports/InspectionReportsTab';
import { CertificationReportsTab } from '@/components/safety/reports/CertificationReportsTab';
import { ComplianceScorecardTab } from '@/components/safety/reports/ComplianceScorecardTab';

export default function SafetyReports() {
  const { loading, incidentMetrics, inspectionMetrics, certificationMetrics, complianceScore, refetch } = useSafetyReports();
  const [activeTab, setActiveTab] = useState('incidents');

  return (
    <>
      <Helmet>
        <title>Safety Reports | Shop Management</title>
        <meta name="description" content="Comprehensive safety reporting including OSHA logs, incident analysis, and compliance scorecards" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Safety Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive safety analytics and compliance reporting
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="default">
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceScore?.overall || 0}%</div>
              <p className="text-xs text-muted-foreground">Overall safety rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incidentMetrics?.totalIncidents || 0}</div>
              <p className="text-xs text-muted-foreground">Last 12 months</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspection Pass Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inspectionMetrics?.passRate || 0}%</div>
              <p className="text-xs text-muted-foreground">{inspectionMetrics?.totalInspections || 0} inspections</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificationMetrics?.validCount || 0}</div>
              <p className="text-xs text-muted-foreground">{certificationMetrics?.expiringSoon || 0} expiring soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="incidents">Incident Reports</TabsTrigger>
            <TabsTrigger value="inspections">Inspection Reports</TabsTrigger>
            <TabsTrigger value="certifications">Certification Reports</TabsTrigger>
            <TabsTrigger value="scorecard">Compliance Scorecard</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            <IncidentReportsTab metrics={incidentMetrics} loading={loading} />
          </TabsContent>

          <TabsContent value="inspections">
            <InspectionReportsTab metrics={inspectionMetrics} loading={loading} />
          </TabsContent>

          <TabsContent value="certifications">
            <CertificationReportsTab metrics={certificationMetrics} loading={loading} />
          </TabsContent>

          <TabsContent value="scorecard">
            <ComplianceScorecardTab score={complianceScore} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
