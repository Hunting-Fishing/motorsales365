
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamPermissions } from "@/components/team/TeamPermissions";
import { PermissionSet } from "@/types/permissions";

interface AddRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  onRoleNameChange: (name: string) => void;
  roleDescription: string;
  onRoleDescriptionChange: (description: string) => void;
  onPermissionsChange: (permissions: PermissionSet) => void;
  onAddRole: () => void;
}

export function AddRoleDialog({
  open,
  onOpenChange,
  roleName,
  onRoleNameChange,
  roleDescription,
  onRoleDescriptionChange,
  onPermissionsChange,
  onAddRole,
}: AddRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input 
                  id="roleName" 
                  value={roleName} 
                  onChange={(e) => onRoleNameChange(e.target.value)} 
                  placeholder="e.g., Senior Technician"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea 
                  id="roleDescription" 
                  value={roleDescription} 
                  onChange={(e) => onRoleDescriptionChange(e.target.value)} 
                  placeholder="Describe this role's purpose and responsibilities"
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
            onClick={onAddRole}
          >
            Create Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
