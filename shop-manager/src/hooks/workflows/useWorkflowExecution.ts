import { useState, useEffect } from 'react';
import { workflowExecutionService, WorkflowExecution } from '@/services/workflows/workflowExecutionService';
import { useToast } from '@/hooks/use-toast';

export function useWorkflowExecution(triggerId?: string) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const fetchExecutions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await workflowExecutionService.getWorkflowExecutions(triggerId);
      
      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow executions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeWorkflow = async (workflowTriggerId: string, contextData: any = {}) => {
    try {
      setIsExecuting(true);
      const { data, error } = await workflowExecutionService.triggerWorkflow(workflowTriggerId, contextData);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Workflow execution started successfully'
      });
      
      // Refresh executions
      await fetchExecutions();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute workflow',
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setIsExecuting(false);
    }
  };

  const retryExecution = async (executionId: string) => {
    try {
      setIsExecuting(true);
      const { data, error } = await workflowExecutionService.retryExecution(executionId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Workflow retry started successfully'
      });
      
      // Refresh executions
      await fetchExecutions();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error retrying workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry workflow execution',
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [triggerId]);

  return {
    executions,
    isLoading,
    isExecuting,
    executeWorkflow,
    retryExecution,
    refetch: fetchExecutions
  };
}

export function useWorkflowExecutionLogs(executionId: string) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    if (!executionId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await workflowExecutionService.getExecutionLogs(executionId);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load execution logs',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [executionId]);

  return {
    logs,
    isLoading,
    refetch: fetchLogs
  };
}