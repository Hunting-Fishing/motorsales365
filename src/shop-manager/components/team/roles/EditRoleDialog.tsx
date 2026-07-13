
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamPermissions } from "@/components/team/TeamPermissions";
import { Role } from "@/types/team";
import { PermissionSet } from "@/types/permissions";

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: Role | null;
  onCurrentRoleChange: (role: Role) => void;
  rolePermissions: PermissionSet | null;
  onPermissionsChange: (permissions: PermissionSet) => void;
  onEditRole: () => void;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  currentRole,
  onCurrentRoleChange,
  rolePermissions,
  onPermissionsChange,
  onEditRole,
}: EditRoleDialogProps) {
  if (!currentRole) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Role: {currentRole?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="editRoleName">Role Name</Label>
                <Input 
                  id="editRoleName" 
                  value={currentRole.name} 
                  onChange={(e) => onCurrentRoleChange({...currentRole, name: e.target.value})} 
                  disabled={currentRole.isDefault}
                />
                {currentRole.isDefault && (
                  <p className="text-xs text-slate-500 mt-1">
                    Default role names cannot be changed
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="editRoleDescription">Description</Label>
                <Textarea 
                  id="editRoleDescription" 
                  value={currentRole.description} 
                  onChange={(e) => onCurrentRoleChange({...currentRole, description: e.target.value})} 
                  rows={3}
                />
              </div>
            </div>
            <div>
              <Label>Set Role Permissions</Label>
              <p className="text-sm text-slate-500 mb-4">
                Customize what users with this role can access
              </p>
              <TeamPermissions 
                memberRole=""
                initialPermissions={rolePermissions as PermissionSet}
                onChange={onPermissionsChange}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="bg-esm-blue-600 hover:bg-esm-blue-700"
            onClick={onEditRole}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
