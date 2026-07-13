
import { toast } from '@/hooks/use-toast';

export function handleApiError(error: any, defaultMessage = 'An error occurred') {
  console.error('API Error:', error);
  
  const message = error?.message || defaultMessage;
  
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive'
  });
}
