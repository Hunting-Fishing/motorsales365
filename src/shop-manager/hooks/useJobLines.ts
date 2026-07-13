
import { useState, useEffect } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { getWorkOrderJobLines } from '@/services/workOrder/jobLinesService';
import { getJobLineParts } from '@/services/workOrder/workOrderPartsService';

export function useJobLines(workOrderId: string) {
  const [jobLines, setJobLines] = useState<WorkOrderJobLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workOrderId) return;

    const fetchJobLines = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobLinesData = await getWorkOrderJobLines(workOrderId);
        
        // Fetch parts for each job line
        const jobLinesWithParts = await Promise.all(
          jobLinesData.map(async (jobLine) => {
            try {
              const parts = await getJobLineParts(jobLine.id);
              return { ...jobLine, parts };
            } catch (partError) {
              console.warn(`Failed to fetch parts for job line ${jobLine.id}:`, partError);
              return { ...jobLine, parts: [] };
            }
          })
        );
        
        setJobLines(jobLinesWithParts);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching job lines:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobLines();
  }, [workOrderId]);

  return { jobLines, setJobLines, isLoading, error };
}
