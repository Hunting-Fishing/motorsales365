import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, Plus, Search, RefreshCw, AlertCircle, Clock, CheckCircle2, BarChart3 } from 'lucide-react';
import { useCorrectiveActions, CorrectiveAction } from '@/hooks/useCorrectiveActions';
import { CorrectiveActionDialog } from '@/components/safety/corrective-actions/CorrectiveActionDialog';
import { CorrectiveActionCard } from '@/components/safety/corrective-actions/CorrectiveActionCard';
import { CorrectiveActionAnalytics } from '@/components/safety/corrective-actions/CorrectiveActionAnalytics';
import { format } from 'date-fns';

export default function SafetyCorrectiveActions() {
  const { loading, actions, openCount, overdueCount, createAction, updateAction, deleteAction, refetch } = useCorrectiveActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleEdit = (action: CorrectiveAction) => {
    setSelectedAction(action);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedAction(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<CorrectiveAction>) => {
    if (selectedAction) {
      await updateAction(selectedAction.id, data);
    } else {
      await createAction(data);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Corrective Actions | Safety Management</title>
        <meta name="description" content="Track and manage corrective and preventive actions (CAPA) for safety compliance" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              Corrective Actions (CAPA)
            </h1>
            <p className="text-muted-foreground mt-1">
              Track corrective and preventive actions from incidents and inspections
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Action
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openCount}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {actions.filter(a => {
                  if (a.status !== 'completed' && a.status !== 'closed') return false;
                  if (!a.completed_date) return false;
                  const date = new Date(a.completed_date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Actions and Analytics */}
        <Tabs defaultValue="actions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search actions..."
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Actions List */}
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading corrective actions...
                  </CardContent>
                </Card>
              ) : filteredActions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No corrective actions found
                  </CardContent>
                </Card>
              ) : (
                filteredActions.map(action => (
                  <CorrectiveActionCard
                    key={action.id}
                    action={action}
                    onEdit={() => handleEdit(action)}
                    onDelete={() => deleteAction(action.id)}
                    onStatusChange={(status) => updateAction(action.id, { status: status as 'open' | 'in_progress' | 'completed' | 'verified' | 'closed' })}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <CorrectiveActionAnalytics actions={actions} />
          </TabsContent>
        </Tabs>
      </div>

      <CorrectiveActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={selectedAction}
        onSave={handleSave}
      />
    </>
  );
}
