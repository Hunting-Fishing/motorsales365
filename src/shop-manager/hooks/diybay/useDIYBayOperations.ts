
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bay } from "@/services/diybay/diybayService";
import { useToast } from "@/hooks/use-toast";

export function useDIYBayOperations(
  bays: Bay[],
  setBays: React.Dispatch<React.SetStateAction<Bay[]>>,
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { toast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);

  const addBay = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Create a new bay with default values - ensure all required fields are present
      const newBayData = {
        bay_name: `Bay ${bays.length + 1}`,
        bay_location: "",
        hourly_rate: 65, // Default hourly rate
        is_active: true,
      };
      
      // Insert new bay into database
      const { data, error } = await supabase
        .from('diy_bay_rates')
        .insert(newBayData)
        .select('*')
        .single();
        
      if (error) throw error;
      
      // Update local state with the new bay, mapping to Bay interface
      if (data) {
        const newBay: Bay = {
          ...data,
          // Ensure backward compatibility with legacy fields
          name: data.bay_name,
          description: data.bay_location,
          bay_number: bays.length + 1,
          bay_type: 'standard',
          features: null
        };
        setBays([...bays, newBay]);
        toast({
          title: "Bay added",
          description: `${data.bay_name} has been added successfully.`
        });
      }
      
      return true;
    } catch (error: any) {
      console.error("Error adding bay:", error);
      setSaveError(error.message);
      toast({
        title: "Error",
        description: `Failed to add bay: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  const saveBay = async (updatedBay: Bay): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Update bay in database
      const { error } = await supabase
        .from('diy_bay_rates')
        .update({
          bay_name: updatedBay.bay_name,
          bay_location: updatedBay.bay_location,
          hourly_rate: updatedBay.hourly_rate,
          daily_rate: updatedBay.daily_rate,
          weekly_rate: updatedBay.weekly_rate,
          monthly_rate: updatedBay.monthly_rate,
          is_active: updatedBay.is_active
        })
        .eq('id', updatedBay.id);
        
      if (error) throw error;
      
      // Update local state
      setBays(bays.map(bay => bay.id === updatedBay.id ? updatedBay : bay));
      
      return true;
    } catch (error: any) {
      console.error("Error saving bay:", error);
      setSaveError(error.message);
      toast({
        title: "Error",
        description: `Failed to save bay: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  const removeBay = async (bayId: string, bayName: string): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Delete bay from database
      const { error } = await supabase
        .from('diy_bay_rates')
        .delete()
        .eq('id', bayId);
        
      if (error) throw error;
      
      // Update local state
      setBays(bays.filter(bay => bay.id !== bayId));
      
      toast({
        title: "Bay removed",
        description: `${bayName} has been removed.`
      });
      
      return true;
    } catch (error: any) {
      console.error("Error removing bay:", error);
      setSaveError(error.message);
      toast({
        title: "Error",
        description: `Failed to remove bay: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    addBay,
    saveBay,
    removeBay,
    saveError
  };
}
