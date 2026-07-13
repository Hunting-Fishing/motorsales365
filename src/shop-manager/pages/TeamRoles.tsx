
import React from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { RolesPageHeader } from "@/components/team/roles/RolesPageHeader";
import { RolesContent } from "@/components/team/roles/RolesContent";
import { RoleDialogs } from "@/components/team/roles/RoleDialogs";
import { useTeamRolesPage } from "@/hooks/useTeamRolesPage";

export default function TeamRoles() {
  const {
    filteredRoles,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    newRoleName,
    setNewRoleName,
    newRoleDescription,
    setNewRoleDescription,
    currentRole,
    setCurrentRole,
    rolePermissions,
    setRolePermissions,
    handleExportRoles,
    onAddRole,
    onEditRole,
    onDeleteRole,
    handleEditRoleClick,
    handleDeleteRoleClick,
    handleDuplicateRoleClick,
    handleReorderRole,
    handleImportRoles
  } = useTeamRolesPage();

  return (
    <ResponsiveContainer maxWidth="full" className="space-y-6">
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <RolesPageHeader 
          onAddRoleClick={() => setIsAddDialogOpen(true)}
          onExportRoles={handleExportRoles}
          onImportRoles={handleImportRoles}
        />
      </Card>

      <RolesContent 
        roles={filteredRoles}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onEditRole={handleEditRoleClick}
        onDeleteRole={handleDeleteRoleClick}
        onDuplicateRole={handleDuplicateRoleClick}
        onReorderRole={handleReorderRole}
      />

      <RoleDialogs 
        addDialogOpen={isAddDialogOpen}
        onAddDialogChange={setIsAddDialogOpen}
        roleName={newRoleName}
        onRoleNameChange={setNewRoleName}
        roleDescription={newRoleDescription}
        onRoleDescriptionChange={setNewRoleDescription}
        onPermissionsChange={setRolePermissions}
        onAddRole={onAddRole}
        
        editDialogOpen={isEditDialogOpen}
        onEditDialogChange={setIsEditDialogOpen}
        currentRole={currentRole}
        onCurrentRoleChange={setCurrentRole}
        rolePermissions={rolePermissions}
        onEditRole={onEditRole}
        
        deleteDialogOpen={isDeleteDialogOpen}
        onDeleteDialogChange={setIsDeleteDialogOpen}
        onDeleteRole={onDeleteRole}
      />
    </ResponsiveContainer>
  );
}
