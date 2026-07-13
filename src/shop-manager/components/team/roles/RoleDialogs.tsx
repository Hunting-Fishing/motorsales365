
import React from "react";
import { Role } from "@/types/team";
import { PermissionSet } from "@/types/permissions";
import { AddRoleDialog } from "./AddRoleDialog";
import { EditRoleDialog } from "./EditRoleDialog";
import { DeleteRoleDialog } from "./DeleteRoleDialog";

interface RoleDialogsProps {
  addDialogOpen: boolean;
  onAddDialogChange: (open: boolean) => void;
  roleName: string;
  onRoleNameChange: (name: string) => void;
  roleDescription: string;
  onRoleDescriptionChange: (description: string) => void;
  onPermissionsChange: (permissions: PermissionSet) => void;
  onAddRole: () => void;
  
  editDialogOpen: boolean;
  onEditDialogChange: (open: boolean) => void;
  currentRole: Role | null;
  onCurrentRoleChange: (role: Role) => void;
  rolePermissions: PermissionSet | null;
  onEditRole: () => void;
  
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  onDeleteRole: () => void;
}

export function RoleDialogs({
  addDialogOpen,
  onAddDialogChange,
  roleName,
  onRoleNameChange,
  roleDescription,
  onRoleDescriptionChange,
  onPermissionsChange,
  onAddRole,
  
  editDialogOpen,
  onEditDialogChange,
  currentRole,
  onCurrentRoleChange,
  rolePermissions,
  onEditRole,
  
  deleteDialogOpen,
  onDeleteDialogChange,
  onDeleteRole,
}: RoleDialogsProps) {
  return (
    <>
      <AddRoleDialog
        open={addDialogOpen}
        onOpenChange={onAddDialogChange}
        roleName={roleName}
        onRoleNameChange={onRoleNameChange}
        roleDescription={roleDescription}
        onRoleDescriptionChange={onRoleDescriptionChange}
        onPermissionsChange={onPermissionsChange}
        onAddRole={onAddRole}
      />

      <EditRoleDialog
        open={editDialogOpen}
        onOpenChange={onEditDialogChange}
        currentRole={currentRole}
        onCurrentRoleChange={onCurrentRoleChange}
        rolePermissions={rolePermissions}
        onPermissionsChange={onPermissionsChange}
        onEditRole={onEditRole}
      />

      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={onDeleteDialogChange}
        currentRole={currentRole}
        onDeleteRole={onDeleteRole}
      />
    </>
  );
}
