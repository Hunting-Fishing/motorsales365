import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useTechnicianOfflineStorage } from './useTechnicianOfflineStorage';
import { usePWA } from './usePWA';
import { useToast } from './use-toast';

export interface TechnicianTask {
  id: string;
  workOrderId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  equipmentName?: string;
  assetNumber?: string;
  customerName?: string;
  dueDate?: string;
  estimatedHours?: number;
  assignedAt?: string;
  completedAt?: string;
  notes?: string;
}

export function useTechnicianTasks() {
  const { shopId } = useShopId();
  const { isOffline } = usePWA();
  const { addToQueue, syncAll } = useTechnicianOfflineStorage();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<TechnicianTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shopId) {
      fetchTasks();
    }
  }, [shopId]);

  const fetchTasks = async () => {
    if (!shopId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Fetch work orders assigned to this technician
      const { data, error: fetchError } = await supabase
        .from('work_orders')
        .select(`
          id,
          description,
          status,
          priority,
          created_at,
          start_time,
          end_time,
          estimated_hours,
          diagnostic_notes,
          customer_id,
          equipment_id,
          customers:customer_id(first_name, last_name)
        `)
        .eq('shop_id', shopId)
        .eq('technician_id', userData.user.id)
        .in('status', ['pending', 'in-progress', 'in_progress', 'blocked'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get equipment names for tasks with equipment_id
      const equipmentIds = data?.filter(wo => wo.equipment_id).map(wo => wo.equipment_id) || [];
      let equipmentMap: Record<string, { name: string; asset_number: string }> = {};
      
      if (equipmentIds.length > 0) {
        const { data: equipmentData } = await supabase
          .from('equipment_assets')
          .select('id, name, asset_number')
          .in('id', equipmentIds);
        
        if (equipmentData) {
          equipmentMap = equipmentData.reduce((acc, eq) => {
            acc[eq.id] = { name: eq.name, asset_number: eq.asset_number };
            return acc;
          }, {} as Record<string, { name: string; asset_number: string }>);
        }
      }

      const formattedTasks: TechnicianTask[] = (data || []).map((wo: any) => {
        const customerData = wo.customers;
        const customerName = customerData 
          ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || 'Unknown'
          : 'Internal';
        
        return {
          id: wo.id,
          workOrderId: wo.id,
          title: wo.description || 'Work Order',
          description: wo.diagnostic_notes || '',
          status: normalizeStatus(wo.status),
          priority: (wo.priority as any) || 'medium',
          equipmentName: wo.equipment_id ? equipmentMap[wo.equipment_id]?.name : undefined,
          assetNumber: wo.equipment_id ? equipmentMap[wo.equipment_id]?.asset_number : undefined,
          customerName,
          dueDate: wo.start_time,
          estimatedHours: wo.estimated_hours,
          assignedAt: wo.created_at,
          completedAt: wo.end_time,
          notes: wo.diagnostic_notes
        };
      });

      setTasks(formattedTasks);
    } catch (err: any) {
      console.error('Error fetching technician tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status: string): TechnicianTask['status'] => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'in-progress':
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'blocked':
        return 'blocked';
      default:
        return 'pending';
    }
  };

  const updateTaskStatus = async (
    taskId: string, 
    newStatus: TechnicianTask['status'],
    notes?: string
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusForDb = newStatus === 'in_progress' ? 'in-progress' : newStatus;
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : undefined;

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: newStatus, completedAt, notes: notes || t.notes }
        : t
    ));

    if (isOffline) {
      // Queue for later sync
      await addToQueue('task_update', {
        workOrderId: taskId,
        status: statusForDb,
        notes,
        completedAt
      });
      
      toast({
        title: 'Saved Offline',
        description: 'Changes will sync when online'
      });
    } else {
      try {
        const { error } = await supabase
          .from('work_orders')
          .update({ 
            status: statusForDb,
            diagnostic_notes: notes || task.notes,
            end_time: completedAt
          })
          .eq('id', taskId);

        if (error) throw error;

        toast({
          title: 'Task Updated',
          description: `Status changed to ${newStatus.replace('_', ' ')}`
        });
      } catch (err: any) {
        // Revert optimistic update
        setTasks(prev => prev.map(t => 
          t.id === taskId ? task : t
        ));
        
        // Queue for later sync
        await addToQueue('task_update', {
          workOrderId: taskId,
          status: statusForDb,
          notes,
          completedAt
        });
        
        toast({
          title: 'Update Failed',
          description: 'Changes saved for later sync',
          variant: 'destructive'
        });
      }
    }
  };

  const startTask = (taskId: string) => updateTaskStatus(taskId, 'in_progress');
  const completeTask = (taskId: string, notes?: string) => updateTaskStatus(taskId, 'completed', notes);
  const blockTask = (taskId: string, reason: string) => updateTaskStatus(taskId, 'blocked', reason);

  return {
    tasks,
    loading,
    error,
    isOffline,
    fetchTasks,
    updateTaskStatus,
    startTask,
    completeTask,
    blockTask,
    todaysTasks: tasks.filter(t => {
      if (!t.dueDate) return true;
      const today = new Date().toDateString();
      const taskDate = new Date(t.dueDate).toDateString();
      return taskDate === today || t.status === 'in_progress';
    }),
    pendingTasks: tasks.filter(t => t.status === 'pending'),
    inProgressTasks: tasks.filter(t => t.status === 'in_progress'),
    blockedTasks: tasks.filter(t => t.status === 'blocked')
  };
}
