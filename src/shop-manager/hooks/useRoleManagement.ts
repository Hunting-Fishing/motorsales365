
import { useState } from "react";
import { Role } from "@/types/team";
import { useRoleFilter } from "./roles/useRoleFilter";
import { useRoleActions } from "./roles/useRoleActions";
import { useRoleImportExport } from "./roles/useRoleImportExport";

export function useRoleManagement(initialRoles: Role[]) {
  // Sort the initial roles by priority
  const sortedInitialRoles = [...initialRoles].sort((a, b) => a.priority - b.priority);
  const [roles, setRoles] = useState<Role[]>(sortedInitialRoles);
  
  // Import role management sub-hooks
  const { searchQuery, setSearchQuery, typeFilter, setTypeFilter, filterRoles } = useRoleFilter();
  const { 
    handleAddRole, 
    handleEditRole, 
    handleDeleteRole, 
    handleDuplicateRole,
    handleReorderRole 
  } = useRoleActions(roles, setRoles);
  const { handleImportRoles } = useRoleImportExport(roles, setRoles);

  // Apply filters to roles
  const filteredRoles = filterRoles(roles);

  return {
    roles,
    filteredRoles,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    handleAddRole,
    handleEditRole,
    handleDeleteRole,
    handleDuplicateRole,
    handleReorderRole,
    handleImportRoles
  };
}
