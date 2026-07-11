
import { Role } from "@/types/team";
import { PermissionSet } from "@/types/permissions";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

export function useRoleActions(roles: Role[], setRoles: React.Dispatch<React.SetStateAction<Role[]>>) {
  const handleAddRole = (
    newRoleName: string, 
    newRoleDescription: string, 
    rolePermissions: PermissionSet | null
  ) => {
    if (!newRoleName.trim()) {
      toast({
        title: "Role name required",
        description: "Please provide a name for the new role",
        variant: "destructive",
      });
      return false;
    }

    if (roles.some(role => role.name.toLowerCase() === newRoleName.toLowerCase())) {
      toast({
        title: "Role already exists",
        description: "A role with this name already exists",
        variant: "destructive",
      });
      return false;
    }

    // Find the highest priority to add new role at the end
    const highestPriority = roles.length > 0 
      ? Math.max(...roles.map(role => role.priority)) 
      : 0;

    const newRole: Role = {
      id: `role-${uuidv4()}`,
      name: newRoleName,
      description: newRoleDescription,
      isDefault: false,
      permissions: rolePermissions || {} as PermissionSet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: highestPriority + 1 // Set priority to be after all existing roles
    };

    setRoles([...roles, newRole]);

    toast({
      title: "Role created successfully",
      description: `The role "${newRoleName}" has been created`,
      variant: "success",
    });
    
    return true;
  };

  const handleEditRole = (updatedRole: Role, newPermissions: PermissionSet | null) => {
    if (!updatedRole) return false;

    const updatedRoles = roles.map(role => {
      if (role.id === updatedRole.id) {
        return {
          ...updatedRole,
          permissions: newPermissions || updatedRole.permissions,
          updatedAt: new Date().toISOString()
        };
      }
      return role;
    });

    setRoles(updatedRoles);

    toast({
      title: "Role updated successfully",
      description: `The role "${updatedRole.name}" has been updated`,
      variant: "success",
    });
    
    return true;
  };

  const handleDeleteRole = (roleToDelete: Role) => {
    if (!roleToDelete) return false;

    if (roleToDelete.isDefault) {
      toast({
        title: "Cannot delete default role",
        description: "Default roles cannot be deleted",
        variant: "destructive",
      });
      return false;
    }

    setRoles(roles.filter(role => role.id !== roleToDelete.id));

    toast({
      title: "Role deleted successfully",
      description: `The role "${roleToDelete.name}" has been deleted`,
      variant: "success",
    });
    
    return true;
  };

  const handleDuplicateRole = (roleToDuplicate: Role) => {
    if (!roleToDuplicate) return false;
    
    // Create a copy with a new name and ID
    const duplicateName = `${roleToDuplicate.name} (Copy)`;
    
    // Check if a role with this name already exists
    if (roles.some(role => role.name.toLowerCase() === duplicateName.toLowerCase())) {
      toast({
        title: "Duplicate name exists",
        description: `A role named "${duplicateName}" already exists`,
        variant: "destructive",
      });
      return false;
    }
    
    // Find the highest priority to add the duplicate after the original
    const highestPriority = Math.max(...roles.map(role => role.priority));
    
    const duplicateRole: Role = {
      id: `role-${uuidv4()}`,
      name: duplicateName,
      description: roleToDuplicate.description,
      isDefault: false, // Duplicated roles are never default
      permissions: {...roleToDuplicate.permissions},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: highestPriority + 1 // Set priority to be after all existing roles
    };
    
    setRoles([...roles, duplicateRole]);
    
    toast({
      title: "Role duplicated successfully",
      description: `Created new role "${duplicateName}" based on "${roleToDuplicate.name}"`,
      variant: "success",
    });
    
    return true;
  };

  // New function to handle role reordering
  const handleReorderRole = (roleId: string, direction: 'up' | 'down') => {
    // Find the role to reorder
    const roleIndex = roles.findIndex(role => role.id === roleId);
    if (roleIndex === -1) return false;

    // Get the current role
    const currentRole = roles[roleIndex];
    
    // Determine target index based on direction
    const targetIndex = direction === 'up' ? roleIndex - 1 : roleIndex + 1;
    
    // Check if target index is valid
    if (targetIndex < 0 || targetIndex >= roles.length) {
      toast({
        title: `Cannot move role ${direction}`,
        description: `The role is already at the ${direction === 'up' ? 'top' : 'bottom'}`,
        variant: "destructive",
      });
      return false;
    }
    
    // Get the target role
    const targetRole = roles[targetIndex];
    
    // Swap priorities
    const updatedRoles = [...roles];
    updatedRoles[roleIndex] = { ...currentRole, priority: targetRole.priority };
    updatedRoles[targetIndex] = { ...targetRole, priority: currentRole.priority };
    
    // Sort by priority to ensure correct order
    const sortedRoles = updatedRoles.sort((a, b) => a.priority - b.priority);
    
    setRoles(sortedRoles);
    
    toast({
      title: "Role order updated",
      description: `The role "${currentRole.name}" has been moved ${direction}`,
      variant: "success",
    });
    
    return true;
  };

  return {
    handleAddRole,
    handleEditRole,
    handleDeleteRole,
    handleDuplicateRole,
    handleReorderRole
  };
}
