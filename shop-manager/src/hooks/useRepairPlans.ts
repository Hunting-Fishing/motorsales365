import { useState, useEffect } from 'react';
import { repairPlanService, RepairPlanWithTasks } from '@/services/repairPlanService';
import { RepairPlan } from '@/types/repairPlan';
import { toast } from '@/hooks/use-toast';

export function useRepairPlans() {
  const [repairPlans, setRepairPlans] = useState<RepairPlanWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepairPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plans = await repairPlanService.getRepairPlans();
      setRepairPlans(plans);
    } catch (err) {
      console.error('Error fetching repair plans:', err);
      setError('Failed to load repair plans');
      toast({
        title: "Error",
        description: "Failed to load repair plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRepairPlan = async (repairPlan: Omit<RepairPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await repairPlanService.createRepairPlan(repairPlan);
      toast({
        title: "Success",
        description: "Repair plan created successfully",
      });
      await fetchRepairPlans(); // Refresh the list
    } catch (err) {
      console.error('Error creating repair plan:', err);
      toast({
        title: "Error",
        description: "Failed to create repair plan",
        variant: "destructive",
      });
    }
  };

  const updateRepairPlan = async (id: string, updates: Partial<RepairPlan>) => {
    try {
      await repairPlanService.updateRepairPlan(id, updates);
      toast({
        title: "Success",
        description: "Repair plan updated successfully",
      });
      await fetchRepairPlans(); // Refresh the list
    } catch (err) {
      console.error('Error updating repair plan:', err);
      toast({
        title: "Error",
        description: "Failed to update repair plan",
        variant: "destructive",
      });
    }
  };

  const deleteRepairPlan = async (id: string) => {
    try {
      await repairPlanService.deleteRepairPlan(id);
      toast({
        title: "Success",
        description: "Repair plan deleted successfully",
      });
      await fetchRepairPlans(); // Refresh the list
    } catch (err) {
      console.error('Error deleting repair plan:', err);
      toast({
        title: "Error",
        description: "Failed to delete repair plan",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRepairPlans();
  }, []);

  return {
    repairPlans,
    loading,
    error,
    createRepairPlan,
    updateRepairPlan,
    deleteRepairPlan,
    refreshRepairPlans: fetchRepairPlans
  };
}