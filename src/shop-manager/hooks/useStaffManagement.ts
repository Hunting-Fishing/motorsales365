import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useFetchUserRoles } from './team/useFetchUserRoles';
import { useShopId } from './useShopId';

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  created_at: string;
  updated_at: string;
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

export interface StaffStats {
  totalStaff: number;
  activeToday: number;
  onLeave: number;
  pendingReviews: number;
}

export function useStaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    activeToday: 0,
    onLeave: 0,
    pendingReviews: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { fetchUserRoles } = useFetchUserRoles();
  const { shopId, loading: shopLoading } = useShopId();

  const fetchStaff = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Only fetch staff if we have a shop_id
      if (!shopId) {
        console.warn('No shop ID available, cannot fetch staff');
        setStaff([]);
        setStats({
          totalStaff: 0,
          activeToday: 0,
          onLeave: 0,
          pendingReviews: 0
        });
        setIsLoading(false);
        return;
      }

      // Fetch profiles and time-off requests in parallel
      const today = new Date().toISOString().split('T')[0];
      
      const [profilesResult, leaveResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title,
            department,
            created_at,
            updated_at,
            shop_id
          `)
          .eq('shop_id', shopId),
        supabase
          .from('time_off_requests')
          .select('employee_id')
          .eq('shop_id', shopId)
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
      ]);

      if (profilesResult.error) throw profilesResult.error;
      
      const profilesData = profilesResult.data;
      const onLeaveIds = new Set(leaveResult.data?.map(r => r.employee_id) || []);

      // Fetch user roles for each profile
      const profileIds = profilesData?.map(p => p.id) || [];
      
      let rolesData: any[] = [];
      if (profileIds.length > 0) {
        try {
          rolesData = await fetchUserRoles();
        } catch (rolesError) {
          console.warn('Error fetching roles:', rolesError);
        }

        // Combine profiles with roles
        const staffWithRoles = profilesData?.map(profile => {
          const userRoles = rolesData
            ?.filter(role => role.user_id === profile.id)
            ?.map(role => role.roles)
            ?.filter(Boolean)
            ?.flat() || []; // Flatten the nested arrays
          
          return {
            ...profile,
            roles: userRoles as Array<{ id: string; name: string; }>
          };
        }) || [];

        setStaff(staffWithRoles);

        // Calculate stats with real leave data
        const totalStaff = staffWithRoles.length;
        const onLeave = onLeaveIds.size;
        const activeToday = totalStaff - onLeave;
        const pendingReviews = 0; // No review tracking table yet

        setStats({
          totalStaff,
          activeToday,
          onLeave,
          pendingReviews
        });
      } else {
        setStaff([]);
        setStats({
          totalStaff: 0,
          activeToday: 0,
          onLeave: 0,
          pendingReviews: 0
        });
      }

    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch staff'));
      toast.error('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };

  const addStaffMember = async (staffData: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    job_title?: string;
    department?: string;
  }) => {
    try {
      if (!shopId) {
        throw new Error('No shop ID available. Cannot add staff member.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([{ ...staffData, shop_id: shopId } as any])
        .select()
        .single();

      if (error) throw error;

      toast.success('Staff member added successfully');
      await fetchStaff(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error adding staff member:', err);
      toast.error('Failed to add staff member');
      throw err;
    }
  };

  const updateStaffMember = async (id: string, updates: Partial<StaffMember>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Staff member updated successfully');
      await fetchStaff(); // Refresh the list
    } catch (err) {
      console.error('Error updating staff member:', err);
      toast.error('Failed to update staff member');
      throw err;
    }
  };

  const removeStaffMember = async (id: string) => {
    try {
      // Since there's no is_active column, we'll delete the profile entirely
      // In a production system, you might want to add an is_active column
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Staff member removed successfully');
      await fetchStaff(); // Refresh the list
    } catch (err) {
      console.error('Error removing staff member:', err);
      toast.error('Failed to remove staff member');
      throw err;
    }
  };

  useEffect(() => {
    // Only fetch staff when we have a shop ID and it's not loading
    if (!shopLoading && shopId) {
      fetchStaff();
    }
  }, [shopId, shopLoading]);

  return {
    staff,
    stats,
    isLoading,
    error,
    fetchStaff,
    addStaffMember,
    updateStaffMember,
    removeStaffMember
  };
}