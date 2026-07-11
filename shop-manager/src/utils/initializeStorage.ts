
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export const initializeStorage = async () => {
  try {
    console.log("Initializing storage...");
    
    // Call the edge function to initialize storage
    const { data, error } = await supabase.functions.invoke('initialize-storage');
    
    if (error) {
      console.error("Storage initialization error:", error);
      
      // If the error contains "already exists", we can consider it initialized
      if (error.message?.includes("already exists")) {
        console.log("Storage already initialized");
        return true;
      }
      
      throw error;
    }
    
    console.log('Storage initialization response:', data);
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    
    // Don't show a toast here - let the calling component decide how to handle the error
    return false;
  }
};

export default initializeStorage;
