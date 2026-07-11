
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Role } from "@/types/team";

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: Role | null;
  onDeleteRole: () => void;
}

export function DeleteRoleDialog({
  open,
  onOpenChange,
  currentRole,
  onDeleteRole,
}: DeleteRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Are you sure you want to delete the role "{currentRole?.name}"? This action cannot be undone.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Note: Any team members currently assigned this role will need to be reassigned.
          </p>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onDeleteRole}
          >
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
