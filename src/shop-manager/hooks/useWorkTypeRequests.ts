import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useWorkTypeRequests() {
  const queryClient = useQueryClient();

  const submitRequest = useMutation({
    mutationFn: async ({ 
      name, 
      moduleType, 
      description 
    }: { 
      name: string; 
      moduleType: string; 
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('work_type_requests')
        .insert([{
          name,
          module_type: moduleType,
          description,
          requested_by: user.id,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-type-requests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your work type request has been submitted for review.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    },
  });

  return {
    submitRequest: submitRequest.mutate,
    isSubmitting: submitRequest.isPending,
  };
}
