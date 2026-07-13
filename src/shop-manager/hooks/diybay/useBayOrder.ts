
import { useState } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { Bay } from '@/services/diybay/diybayService';
import { useToast } from '@/hooks/use-toast';

export function useBayOrder(bays: Bay[], setBays: React.Dispatch<React.SetStateAction<Bay[]>>) {
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const { toast } = useToast();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Get the indexes for reordering
    const oldIndex = bays.findIndex(bay => bay.id === active.id);
    const newIndex = bays.findIndex(bay => bay.id === over.id);
    
    if (oldIndex < 0 || newIndex < 0) return;
    
    // Create a new array with the updated order
    const newOrder = [...bays];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);
    
    // Update the display order in the UI immediately
    setBays(newOrder);
    
    // Save the new order to the database
    setIsSavingOrder(true);
    
    try {
      // Update display_order for each bay individually
      for (let i = 0; i < newOrder.length; i++) {
        const bay = newOrder[i];
        const { error } = await supabase
          .from('diy_bay_rates')
          .update({ display_order: i })
          .eq('id', bay.id);
          
        if (error) throw error;
      }
      
      toast({
        title: "Bay order updated",
        description: "Your bay order has been saved."
      });
    } catch (error: any) {
      console.error('Error saving bay order:', error);
      toast({
        title: "Error saving order",
        description: error.message,
        variant: "destructive"
      });
      
      // Revert to original order on error
      setBays(bays);
    } finally {
      setIsSavingOrder(false);
    }
  };

  return {
    handleDragEnd,
    isSavingOrder
  };
}
