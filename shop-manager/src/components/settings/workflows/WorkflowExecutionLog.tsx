import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowExecution } from '@/hooks/workflows/useWorkflowExecution';

interface WorkflowExecution {
  id: string;
  trigger_id: string;
  work_order_id: string | null;
  execution_status: string;
  triggered_at: string;
  completed_at: string | null;
  execution_log: any;
  error_message: string | null;
  workflow_triggers?: {
    name: string;
  };
}

export function WorkflowExecutionLog() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const { retryExecution, isExecuting } = useWorkflowExecution();

  const fetchExecutions = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow_triggers (
            name
          )
        `)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('execution_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load execution log',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Play className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s`;
    if (diffSecs < 3600) return `${Math.round(diffSecs / 60)}m`;
    return `${Math.round(diffSecs / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Execution Log</h2>
          <p className="text-muted-foreground">
            Monitor workflow execution history and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchExecutions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Executions Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Workflow executions will appear here once your automated workflows start running.
            </p>
            {statusFilter !== 'all' && (
              <Button variant="outline" onClick={() => setStatusFilter('all')}>
                Show All Executions
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {executions.map((execution) => (
            <Card key={execution.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.execution_status)}
                    <div>
                      <div className="font-medium">
                        {execution.workflow_triggers?.name || 'Unknown Workflow'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {execution.work_order_id ? 
                          `Work Order: ${execution.work_order_id.slice(0, 8)}...` : 
                          'System trigger'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(execution.execution_status)}>
                      {execution.execution_status}
                    </Badge>
                    
                    {execution.execution_status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryExecution(execution.id)}
                        disabled={isExecuting}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                    
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {new Date(execution.triggered_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(execution.triggered_at, execution.completed_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {execution.error_message && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm text-red-800">
                      <strong>Error:</strong> {execution.error_message}
                    </div>
                  </div>
                )}

                {execution.execution_log && Array.isArray(execution.execution_log) && execution.execution_log.length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <div className="text-sm">
                      <strong>Execution Steps:</strong>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {execution.execution_log.map((step: any, index: number) => (
                          <li key={index} className="text-xs">
                            • {step.message || step.action || JSON.stringify(step)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}