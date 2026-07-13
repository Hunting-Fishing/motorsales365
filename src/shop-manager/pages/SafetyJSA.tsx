import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobSafetyAnalyses, JobSafetyAnalysis } from '@/hooks/useJobSafetyAnalysis';
import { JSACard } from '@/components/safety/jsa/JSACard';
import { CreateJSADialog } from '@/components/safety/jsa/CreateJSADialog';
import { JSADetailsSheet } from '@/components/safety/jsa/JSADetailsSheet';
import { Plus, Search, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SafetyJSA() {
  const { jsaList, isLoading } = useJobSafetyAnalyses();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedJSA, setSelectedJSA] = useState<JobSafetyAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredJSAs = jsaList.filter(jsa => {
    const matchesSearch = jsa.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jsa.jsa_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || jsa.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const draftJSAs = filteredJSAs.filter(j => j.status === 'draft');
  const pendingJSAs = filteredJSAs.filter(j => j.status === 'pending_approval');
  const approvedJSAs = filteredJSAs.filter(j => j.status === 'approved');
  const highRiskJSAs = jsaList.filter(j => j.overall_risk_level === 'high' || j.overall_risk_level === 'critical');

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Safety Analysis</h1>
          <p className="text-muted-foreground">Pre-job hazard identification and risk assessment</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New JSA
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total JSAs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jsaList.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingJSAs.length}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{approvedJSAs.length}</div>
            <p className="text-xs text-muted-foreground">ready to use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{highRiskJSAs.length}</div>
            <p className="text-xs text-muted-foreground">require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search JSAs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* JSA Lists */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            All ({filteredJSAs.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-2">
            <Clock className="h-4 w-4" />
            Draft ({draftJSAs.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending ({pendingJSAs.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedJSAs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredJSAs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No JSAs found. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJSAs.map(jsa => (
                <JSACard
                  key={jsa.id}
                  jsa={jsa}
                  onClick={() => setSelectedJSA(jsa)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          {draftJSAs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No draft JSAs
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {draftJSAs.map(jsa => (
                <JSACard key={jsa.id} jsa={jsa} onClick={() => setSelectedJSA(jsa)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingJSAs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No JSAs pending approval
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingJSAs.map(jsa => (
                <JSACard key={jsa.id} jsa={jsa} onClick={() => setSelectedJSA(jsa)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedJSAs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved JSAs
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedJSAs.map(jsa => (
                <JSACard key={jsa.id} jsa={jsa} onClick={() => setSelectedJSA(jsa)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateJSADialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <JSADetailsSheet
        jsa={selectedJSA}
        open={!!selectedJSA}
        onOpenChange={(open) => !open && setSelectedJSA(null)}
      />
    </div>
  );
}
