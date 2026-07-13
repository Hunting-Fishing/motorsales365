
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useTagSelector = (selectedTags: string[], onChange: (tags: string[]) => void) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        // Since customer_tags table doesn't exist, use a fallback approach
        // Try to get tags from customer_segments instead
        const { data, error } = await supabase
          .from('customer_segments')
          .select('name')
          .order('name', { ascending: true });
        
        if (error) {
          console.error("Error fetching tags:", error);
          toast({
            title: "Error",
            description: "Failed to load tags. Please try again.",
            variant: "destructive"
          });
        } else {
          const tagNames = data?.map(segment => segment.name) || [];
          setAvailableTags(tagNames);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTags();
  }, [toast]);
  
  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
  };
  
  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };
  
  return {
    availableTags,
    isLoading,
    addTag,
    removeTag,
  };
};
