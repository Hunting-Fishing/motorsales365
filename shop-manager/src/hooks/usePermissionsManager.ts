import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import type { Permission, RolePermission } from '@/types/phase4';

export function usePermissionsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    fetchPermissions();
    fetchRolePermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }]);

      if (error) throw error;
      
      await fetchRolePermissions();
      toast({
        title: 'Success',
        description: 'Permission assigned successfully'
      });
    } catch (error: any) {
      console.error('Error assigning permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign permission',
        variant: 'destructive'
      });
    }
  };

  const removePermissionFromRole = async (rolePermissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('id', rolePermissionId);

      if (error) throw error;
      
      await fetchRolePermissions();
      toast({
        title: 'Success',
        description: 'Permission removed successfully'
      });
    } catch (error: any) {
      console.error('Error removing permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove permission',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    permissions,
    rolePermissions,
    assignPermissionToRole,
    removePermissionFromRole,
    refetch: () => {
      fetchPermissions();
      fetchRolePermissions();
    }
  };
}
