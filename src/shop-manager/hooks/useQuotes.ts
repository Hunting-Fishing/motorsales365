
import { useState, useEffect, useCallback } from 'react';
import { Quote } from '@/types/quote';
import { getAllQuotes, updateQuoteStatus } from '@/services/quote/quoteService';
import { toast } from '@/hooks/use-toast';

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      console.log('useQuotes: Fetching quotes...');
      setLoading(true);
      setError(null);
      
      const data = await getAllQuotes();
      console.log('useQuotes: Quotes fetched successfully:', data.length);
      setQuotes(data || []);
    } catch (err: any) {
      console.error('useQuotes: Error fetching quotes:', err);
      const errorMessage = err.message || 'Failed to load quotes';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const updateStatus = async (id: string, status: Quote['status']) => {
    try {
      console.log('useQuotes: Updating quote status:', id, status);
      const updatedQuote = await updateQuoteStatus(id, status);
      
      if (updatedQuote) {
        await fetchQuotes();
        
        toast({
          title: "Success",
          description: "Quote status updated successfully"
        });
      }
    } catch (err: any) {
      console.error('useQuotes: Error updating status:', err);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive"
      });
    }
  };

  return {
    quotes,
    loading,
    error,
    refetch: fetchQuotes,
    updateQuoteStatus: updateStatus
  };
}
