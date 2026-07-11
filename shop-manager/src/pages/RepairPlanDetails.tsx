
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { repairPlansService, RepairPlan, RepairPlanTask } from '@/services/repairPlansService';

interface DisplayRepairPlan extends RepairPlan {
  tasks: RepairPlanTask[];
}

export default function RepairPlanDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [repairPlan, setRepairPlan] = useState<RepairPlan | null>(null);
  const [tasks, setTasks] = useState<RepairPlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRepairPlanData();
    }
  }, [id]);

  const fetchRepairPlanData = async () => {
    try {
      setLoading(true);
      
      // Fetch repair plan from database
      const plan = await repairPlansService.getRepairPlan(id!);
      if (!plan) {
        throw new Error('Repair plan not found');
      }

      setRepairPlan(plan);
      
      // Fetch tasks for this repair plan
      const planTasks = await repairPlansService.getRepairPlanTasks(id!);
      setTasks(planTasks);

    } catch (error: any) {
      console.error('Error fetching repair plan data:', error);
      toast({
        title: "Error",
        description: "Failed to load repair plan details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<RepairPlanTask>) => {
    try {
      await repairPlansService.updateTask(taskId, updates);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));

      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading repair plan...</div>
      </div>
    );
  }

  if (!repairPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Repair plan not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-4">{repairPlan.plan_name}</h1>
            <p className="text-gray-600 mb-4">{repairPlan.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Status:</span> <span className="capitalize">{repairPlan.status}</span>
              </div>
              <div>
                <span className="font-medium">Priority:</span> <span className="capitalize">{repairPlan.priority}</span>
              </div>
              <div>
                <span className="font-medium">Estimated Cost:</span> ${repairPlan.estimated_cost?.toFixed(2) || '0.00'}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {repairPlan.estimated_duration_hours || 0} hours
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{task.task_name}</h3>
                  <p className="text-gray-600 text-sm">{task.description}</p>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>Status: <span className="capitalize">{task.status}</span></span>
                    <span>Assigned to: {task.assigned_to || 'Unassigned'}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Estimated: {task.estimated_duration_minutes ? Math.round(task.estimated_duration_minutes / 60 * 10) / 10 : 0} hours
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 text-center py-8">No tasks found for this repair plan.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Activity</h2>
            <p className="text-gray-600">No recent activity.</p>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Update Status
              </button>
              <button className="w-full border border-gray-300 py-2 px-4 rounded hover:bg-gray-50">
                Add Task
              </button>
              <button className="w-full border border-gray-300 py-2 px-4 rounded hover:bg-gray-50">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
