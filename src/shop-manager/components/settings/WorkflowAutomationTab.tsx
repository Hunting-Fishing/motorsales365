import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Workflow, 
  Zap, 
  Settings, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  ArrowRight,
  Brain
} from 'lucide-react';
import { useWorkflowTriggers } from '@/hooks/workflows/useWorkflowTriggers';
import { WorkflowBuilder } from './workflows/WorkflowBuilder';
import { WorkflowExecutionLog } from './workflows/WorkflowExecutionLog';
import { WorkflowTemplates } from './workflows/WorkflowTemplates';
import { StatusAutomationRules } from './workflows/StatusAutomationRules';
import { SmartSchedulingEngine } from './workflows/SmartSchedulingEngine';
import { NotificationAutomation } from './workflows/NotificationAutomation';

export function WorkflowAutomationTab() {
  const [activeTab, setActiveTab] = useState('triggers');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);
  
  const { 
    triggers, 
    isLoading, 
    toggleTrigger, 
    deleteTrigger,
    refetch 
  } = useWorkflowTriggers();

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-gray-400';
  };

  const getTriggerTypeIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'status_change': return <ArrowRight className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      case 'field_change': return <Edit className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflowId={editingWorkflow}
        onClose={() => {
          setShowBuilder(false);
          setEditingWorkflow(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workflow Automation</h1>
            <p className="text-muted-foreground">
              Automate work order processes with intelligent triggers and actions
            </p>
          </div>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="triggers" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline">Status Rules</span>
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Smart Scheduling</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="executions" className="gap-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Execution Log</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-muted rounded w-1/3"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : triggers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Workflow className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Workflows Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Create your first workflow to automate work order processes and save time.
                </p>
                <Button onClick={() => setShowBuilder(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {triggers.map((trigger) => (
                <Card key={trigger.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getTriggerTypeIcon(trigger.trigger_type)}
                          <div>
                            <CardTitle className="text-lg">{trigger.name}</CardTitle>
                            <CardDescription>{trigger.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={trigger.is_active}
                          onCheckedChange={() => toggleTrigger(trigger.id, !trigger.is_active)}
                        />
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(trigger.is_active)}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="gap-1">
                          {getTriggerTypeIcon(trigger.trigger_type)}
                          {trigger.trigger_type.replace('_', ' ')}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(trigger.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingWorkflow(trigger.id);
                            setShowBuilder(true);
                          }}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTrigger(trigger.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="status">
          <StatusAutomationRules />
        </TabsContent>

        <TabsContent value="scheduling">
          <SmartSchedulingEngine />
        </TabsContent>

        <TabsContent value="templates">
          <WorkflowTemplates onUseTemplate={(template) => {
            setEditingWorkflow(null);
            setShowBuilder(true);
          }} />
        </TabsContent>

        <TabsContent value="executions">
          <WorkflowExecutionLog />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Workflows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{triggers.length}</div>
                <p className="text-sm text-muted-foreground">
                  {triggers.filter(t => t.is_active).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-sm text-muted-foreground">
                  Executions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-sm text-muted-foreground">
                  No data yet
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>
                Monitor how your workflows are performing over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-full mx-auto w-fit">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">No Analytics Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Create and run workflows to see performance metrics
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}