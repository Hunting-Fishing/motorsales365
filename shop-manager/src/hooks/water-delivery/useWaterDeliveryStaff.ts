import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface WaterDeliveryStaffMember {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  roles: Array<{ id: string; name: string }>;
  profile_id?: string; // Link to auth profile if they have login
  is_active: boolean;
  hire_date?: string;
  notes?: string;
  created_at: string;
}

export interface CreateStaffInput {
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  role_id?: string;
  send_invitation?: boolean;
  password?: string;
}

export interface UpdateStaffInput {
  id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  is_active?: boolean;
}

// Water Delivery specific roles - includes universal roles (owner, admin, manager) 
// and module-specific roles tagged with 'water-delivery' module_slug
const WATER_DELIVERY_ROLE_NAMES = [
  'owner', 'admin', 'manager', // Universal roles
  'dispatch', 'truck_driver', 'operations_manager', 'yard_manager', // Water delivery specific
] as const;

export function useWaterDeliveryStaff() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ['water-delivery-staff', shopId],
    queryFn: async (): Promise<WaterDeliveryStaffMember[]> => {
      if (!shopId) return [];

      // Fetch staff from dedicated water_delivery_staff table
      const { data: staffData, error: staffError } = await supabase
        .from('water_delivery_staff')
        .select('*')
        .eq('shop_id', shopId)
        .order('first_name', { ascending: true });

      if (staffError) {
        console.error('Error fetching water delivery staff:', staffError);
        throw staffError;
      }

      // Fetch roles for each staff member
      const staffWithRoles = await Promise.all(
        (staffData || []).map(async (staff) => {
          const { data: staffRoles } = await supabase
            .from('water_delivery_staff_roles')
            .select(`
              roles (
                id,
                name
              )
            `)
            .eq('staff_id', staff.id);

          const roles = (staffRoles || [])
            .map((sr: any) => sr.roles)
            .filter(Boolean);

          return {
            ...staff,
            roles,
          } as WaterDeliveryStaffMember;
        })
      );

      return staffWithRoles;
    },
    enabled: !!shopId,
  });

  const createStaffMutation = useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      if (!shopId) throw new Error('Shop ID is required');

      // Get current user ID for created_by
      const { data: { user } } = await supabase.auth.getUser();

      // Create staff in water_delivery_staff table
      const { data: staff, error: staffError } = await supabase
        .from('water_delivery_staff')
        .insert({
          first_name: input.first_name,
          last_name: input.last_name,
          middle_name: input.middle_name || null,
          email: input.email,
          phone: input.phone || null,
          job_title: input.job_title || null,
          department: input.department || null,
          shop_id: shopId,
          is_active: true,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (staffError) {
        console.error('Error creating staff:', staffError);
        throw staffError;
      }

      // Assign role if provided
      if (input.role_id && staff) {
        const { error: roleError } = await supabase
          .from('water_delivery_staff_roles')
          .insert({
            staff_id: staff.id,
            role_id: input.role_id,
            assigned_by: user?.id || null,
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          // Don't throw - staff was created successfully
          toast.warning('Staff created but role assignment failed');
        }
      }

      // If send_invitation is true, we would need to create an auth user
      // and link them to this staff record via profile_id
      // For now, we skip this as staff can exist without auth accounts
      if (input.send_invitation) {
        toast.info('Staff created. Invitation system coming soon.');
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
      toast.success('Staff member created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating staff:', error);
      if (error.code === '23505') {
        toast.error('A staff member with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create staff member');
      }
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (input: UpdateStaffInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('water_delivery_staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating staff:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
      toast.success('Staff member updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ staffId, roleId }: { staffId: string; roleId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // First remove existing roles for this staff member
      await supabase
        .from('water_delivery_staff_roles')
        .delete()
        .eq('staff_id', staffId);

      // Then assign new role
      const { error } = await supabase
        .from('water_delivery_staff_roles')
        .insert({
          staff_id: staffId,
          role_id: roleId,
          assigned_by: user?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (staff: WaterDeliveryStaffMember) => {
      // Future implementation - would send invitation email
      toast.info('Invitation system coming soon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const deactivateStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('water_delivery_staff')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
      toast.success('Staff member deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate staff member');
    },
  });

  const reactivateStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('water_delivery_staff')
        .update({ is_active: true })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-staff', shopId] });
      toast.success('Staff member reactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reactivate staff member');
    },
  });

  return {
    staff: staffQuery.data || [],
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    refetch: staffQuery.refetch,
    createStaff: createStaffMutation.mutateAsync,
    isCreating: createStaffMutation.isPending,
    updateStaff: updateStaffMutation.mutateAsync,
    isUpdating: updateStaffMutation.isPending,
    assignRole: assignRoleMutation.mutateAsync,
    isAssigningRole: assignRoleMutation.isPending,
    resendInvitation: resendInvitationMutation.mutateAsync,
    isResending: resendInvitationMutation.isPending,
    deactivateStaff: deactivateStaffMutation.mutateAsync,
    reactivateStaff: reactivateStaffMutation.mutateAsync,
  };
}

// Hook to fetch available roles for Water Delivery module
export function useAvailableRoles() {
  return useQuery({
    queryKey: ['available-roles', 'water-delivery'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, display_order, module_slug')
        .or('module_slug.eq.water-delivery,module_slug.is.null') // Water delivery specific or universal
        .in('name', WATER_DELIVERY_ROLE_NAMES)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
