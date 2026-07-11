import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login: string | null;
  created_at: string;
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

class UserService {
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(profile => ({
      id: profile.id,
      email: profile.email || 'unknown@example.com',
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
      role: 'user', // Default role
      status: 'active', // Default status
      last_login: null, // Would need to track this separately
      created_at: profile.created_at,
      permissions: [], // Would need to fetch from role permissions
    })) || [];
  }

  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        user_roles(count)
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    return data?.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || `${role.name} role`,
      permissions: [], // Would need role_permissions table
      user_count: role.user_roles?.length || 0,
    })) || [];
  }

  async getPermissions(): Promise<Permission[]> {
    // Mock permissions - in real app these would come from a permissions table
    return [
      {
        id: '1',
        name: 'read_customers',
        description: 'View customer information',
        category: 'customers',
      },
      {
        id: '2',
        name: 'write_customers',
        description: 'Create and edit customers',
        category: 'customers',
      },
      {
        id: '3',
        name: 'delete_customers',
        description: 'Delete customers',
        category: 'customers',
      },
      {
        id: '4',
        name: 'read_work_orders',
        description: 'View work orders',
        category: 'work_orders',
      },
      {
        id: '5',
        name: 'write_work_orders',
        description: 'Create and edit work orders',
        category: 'work_orders',
      },
      {
        id: '6',
        name: 'admin_settings',
        description: 'Access admin settings',
        category: 'administration',
      },
    ];
  }

  async updateUserStatus(userId: string, status: User['status']): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async assignUserRole(userId: string, roleId: string): Promise<void> {
    // First remove existing roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Then assign new role
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
      });

    if (error) throw error;
  }

  async createRole(role: Omit<Role, 'id' | 'user_count'>): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        name: role.name as any, // Cast to handle enum constraint
        description: role.description,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      permissions: role.permissions,
      user_count: 0,
    };
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) throw error;
  }
}

export const userService = new UserService();