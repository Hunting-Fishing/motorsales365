
import { useState, useEffect } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { getWorkOrderJobLines } from '@/services/workOrder/jobLinesService';

export function useWorkOrderJobLines(workOrderId: string) {
  const [jobLines, setJobLines] = useState<WorkOrderJobLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobLines = async () => {
    if (!workOrderId || workOrderId === 'new') {
      setJobLines([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getWorkOrderJobLines(workOrderId);
      
      const mappedJobLines: WorkOrderJobLine[] = (data || []).map(line => ({
        id: line.id,
        work_order_id: line.work_order_id,
        name: line.name,
        category: line.category || '',
        subcategory: line.subcategory || '',
        description: line.description || '',
        estimated_hours: line.estimated_hours || 0,
        labor_rate: line.labor_rate || 0,
        labor_rate_type: line.labor_rate_type || 'standard',
        total_amount: line.total_amount || 0,
        status: line.status || 'pending',
        display_order: line.display_order || 0,
        notes: line.notes || '',
        created_at: line.created_at,
        updated_at: line.updated_at
      }));

      setJobLines(mappedJobLines);
    } catch (err) {
      console.error('Error fetching job lines:', err);
      setError(err as Error);
      setJobLines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobLines();
  }, [workOrderId]);

  const updateJobLines = (updatedJobLines: WorkOrderJobLine[]) => {
    setJobLines(updatedJobLines);
  };

  const refreshJobLines = async () => {
    console.log('Refreshing job lines...');
    await fetchJobLines();
  };

  const addJobLines = (newJobLines: WorkOrderJobLine[]) => {
    setJobLines(prevJobLines => [...prevJobLines, ...newJobLines]);
  };

  const updateJobLine = (updatedJobLine: WorkOrderJobLine) => {
    setJobLines(prevJobLines => 
      prevJobLines.map(line => 
        line.id === updatedJobLine.id ? updatedJobLine : line
      )
    );
  };

  const removeJobLine = (jobLineId: string) => {
    setJobLines(prevJobLines => 
      prevJobLines.filter(line => line.id !== jobLineId)
    );
  };

  return {
    jobLines,
    isLoading,
    error,
    updateJobLines,
    refreshJobLines,
    addJobLines,
    updateJobLine,
    removeJobLine
  };
}
