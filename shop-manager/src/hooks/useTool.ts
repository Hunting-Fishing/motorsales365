import { useState, useEffect } from 'react';
import { toolService, Tool, ToolReview } from '@/services/toolService';

export function useTool(toolId: string) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [reviews, setReviews] = useState<ToolReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTool = async () => {
      if (!toolId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [toolData, reviewsData] = await Promise.all([
          toolService.getToolById(toolId),
          toolService.getToolReviews(toolId)
        ]);
        
        setTool(toolData);
        setReviews(reviewsData);
      } catch (err) {
        console.error('Error fetching tool data:', err);
        setError('Failed to load tool information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTool();
  }, [toolId]);

  return { tool, reviews, isLoading, error };
}