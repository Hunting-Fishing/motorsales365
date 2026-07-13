
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Define follow up type based on the application needs
export interface FollowUp {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  status: string;
  dueDate: string;
  notes?: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  workOrderId?: string;
  vehicleId?: string;
}

export const useFollowUps = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch follow-ups from Supabase
    const fetchFollowUps = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get follow ups from the follow_ups table with joined customer data
        const { data, error } = await supabase
          .from('follow_ups')
          .select(`
            id,
            customer_id,
            customers(first_name, last_name),
            type,
            status,
            due_date,
            notes,
            assigned_to,
            profiles:assigned_to(first_name, last_name),
            created_at,
            updated_at,
            completed_at,
            work_order_id,
            vehicle_id
          `)
          .order('due_date', { ascending: true });

        if (error) {
          throw error;
        }

        if (!data) {
          setFollowUps([]);
          return;
        }

        // Map the data to our FollowUp type
        const mappedFollowUps = data.map((item: any) => ({
          id: item.id,
          customerId: item.customer_id,
          customerName: item.customers 
            ? `${item.customers.first_name} ${item.customers.last_name}`
            : 'Unknown Customer',
          type: item.type,
          status: item.status,
          dueDate: item.due_date,
          notes: item.notes,
          assignedToId: item.assigned_to,
          assignedToName: item.profiles 
            ? `${item.profiles.first_name} ${item.profiles.last_name}`
            : undefined,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          completedAt: item.completed_at,
          workOrderId: item.work_order_id,
          vehicleId: item.vehicle_id
        }));

        setFollowUps(mappedFollowUps as FollowUp[]);
      } catch (err: any) {
        console.error('Error fetching follow-ups:', err);
        setError(err.message || 'Failed to load follow-ups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowUps();
  }, []);

  return { followUps, isLoading, error };
};
