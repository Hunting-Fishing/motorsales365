import { supabase } from '@/integrations/supabase/client';
import { AuthSecurityService } from './authSecurity';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RolePermissions {
  canViewUsers: boolean;
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canViewInventory: boolean;
  canManageInventory: boolean;
  canViewWorkOrders: boolean;
  canManageWorkOrders: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export class SecureRoleManager {
  private static roleHierarchy: Record<AppRole, number> = {
    customer: 1,
    reception: 2,
    deckhand: 3,
    technician: 3,
    other_staff: 3,
    yard: 3,
    truck_driver: 3,
    welder: 4,
    crane_operator: 4,
    rigger: 4,
    diver: 4,
    boson: 4,
    marketing: 4,
    parts_manager: 4,
    marine_engineer: 4,
    dispatch: 5,
    office_admin: 5,
    service_advisor: 5,
    mate: 5,
    chief_engineer: 5,
    fishing_master: 5,
    yard_manager_assistant: 5,
    mechanic_manager_assistant: 5,
    yard_manager: 6,
    mechanic_manager: 6,
    manager: 6,
    operations_manager: 7,
    captain: 7,
    admin: 7,
    developer: 8,
    owner: 8,
  };

  private static rolePermissions: Record<AppRole, RolePermissions> = {
    customer: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: false,
      canManageInventory: false,
      canViewWorkOrders: true, // Only their own
      canManageWorkOrders: false,
      canViewReports: false,
      canManageSettings: false,
    },
    reception: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: false,
      canViewReports: false,
      canManageSettings: false,
    },
    technician: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    parts_manager: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    service_advisor: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    manager: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    admin: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: true,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    owner: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: true,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    other_staff: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: false,
      canViewReports: false,
      canManageSettings: false,
    },
    marketing: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: false,
      canManageInventory: false,
      canViewWorkOrders: false,
      canManageWorkOrders: false,
      canViewReports: true,
      canManageSettings: false,
    },
    deckhand: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    boson: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    mate: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    captain: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    chief_engineer: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    marine_engineer: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    fishing_master: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    yard: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: false,
      canViewReports: false,
      canManageSettings: false,
    },
    truck_driver: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    welder: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    crane_operator: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    rigger: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    diver: {
      canViewUsers: false,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: false,
      canManageSettings: false,
    },
    dispatch: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    office_admin: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: false,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    yard_manager: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    operations_manager: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
    mechanic_manager: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    yard_manager_assistant: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    mechanic_manager_assistant: {
      canViewUsers: true,
      canManageUsers: false,
      canAssignRoles: false,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: false,
    },
    developer: {
      canViewUsers: true,
      canManageUsers: true,
      canAssignRoles: true,
      canViewInventory: true,
      canManageInventory: true,
      canViewWorkOrders: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true,
    },
  };

  /**
   * Get user's current roles
   */
  static async getCurrentUserRoles(): Promise<AppRole[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return [];

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          role:roles(name)
        `)
        .eq('user_id', session.session.user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return userRoles?.map((ur: any) => ur.role.name) || [];
    } catch (error) {
      console.error('Error getting current user roles:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(permission: keyof RolePermissions): Promise<boolean> {
    const roles = await this.getCurrentUserRoles();
    
    // Check if any of the user's roles grants this permission
    return roles.some(role => {
      const rolePerms = this.rolePermissions[role];
      return rolePerms && rolePerms[permission];
    });
  }

  /**
   * Get user's effective permissions (highest role wins)
   */
  static async getUserPermissions(): Promise<RolePermissions> {
    const roles = await this.getCurrentUserRoles();
    
    if (roles.length === 0) {
      return this.rolePermissions.customer; // Default to customer permissions
    }

    // Find the highest role
    const highestRole = roles.reduce((highest, current) => {
      const currentLevel = this.roleHierarchy[current] || 0;
      const highestLevel = this.roleHierarchy[highest] || 0;
      return currentLevel > highestLevel ? current : highest;
    });

    return this.rolePermissions[highestRole] || this.rolePermissions.customer;
  }

  /**
   * Securely assign role to user (with proper validation)
   */
  static async assignRole(
    targetUserId: string,
    roleName: AppRole,
    assignedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = assignedBy || session.session?.user?.id;
      
      if (!currentUserId) {
        return { success: false, error: 'Authentication required' };
      }

      // Validate permission to assign roles
      const canAssign = await AuthSecurityService.validateRoleAssignment(
        currentUserId,
        roleName
      );

      if (!canAssign) {
        await AuthSecurityService.logSecurityEvent('permission_denied', {
          action: 'role_assignment',
          target_user: targetUserId,
          target_role: roleName,
          assigned_by: currentUserId,
        });
        return { success: false, error: 'Insufficient permissions to assign roles' };
      }

      // Get role ID
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError || !role) {
        return { success: false, error: 'Invalid role specified' };
      }

      // Assign role
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: targetUserId,
          role_id: role.id,
        });

      if (assignError) {
        return { success: false, error: assignError.message };
      }

      // Log the role assignment
      await AuthSecurityService.logSecurityEvent('role_change', {
        action: 'role_assigned',
        target_user: targetUserId,
        target_role: roleName,
        assigned_by: currentUserId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred while assigning role' 
      };
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(
    targetUserId: string,
    roleName: AppRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user?.id;
      
      if (!currentUserId) {
        return { success: false, error: 'Authentication required' };
      }

      // Validate permission to remove roles
      const canAssign = await AuthSecurityService.validateRoleAssignment(
        currentUserId,
        roleName
      );

      if (!canAssign) {
        await AuthSecurityService.logSecurityEvent('permission_denied', {
          action: 'role_removal',
          target_user: targetUserId,
          target_role: roleName,
          assigned_by: currentUserId,
        });
        return { success: false, error: 'Insufficient permissions to remove roles' };
      }

      // Remove role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role_id', (
          await supabase
            .from('roles')
            .select('id')
            .eq('name', roleName)
            .single()
        ).data?.id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log the role removal
      await AuthSecurityService.logSecurityEvent('role_change', {
        action: 'role_removed',
        target_user: targetUserId,
        target_role: roleName,
        assigned_by: currentUserId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred while removing role' 
      };
    }
  }
}