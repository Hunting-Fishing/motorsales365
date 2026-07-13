import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserPlus, XCircle } from "lucide-react";
import { StaffMember } from "@/types/invoice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define the props interface for the InvoiceRightColumn component
export interface InvoiceRightColumnProps {
  createdBy?: string; // Support both camelCase and snake_case
  created_by?: string;
  assignedStaff: StaffMember[];
  staffMembers: StaffMember[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  showStaffDialog: boolean;
  setShowStaffDialog: (show: boolean) => void;
  onCreatedByChange: (value: any) => void;
  onAddStaffMember: (staff: StaffMember) => void;
  onRemoveStaffMember: (staffId: string) => void;
  onTaxRateChange: (value: number) => void;
}

// Define the StaffDialog component
const StaffDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  staffMembers: StaffMember[];
  onSelect: (staff: StaffMember) => void;
}> = ({ open, onClose, staffMembers, onSelect }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {staffMembers.map((staff) => (
            <Button
              key={staff.id}
              variant="outline"
              className="justify-start"
              onClick={() => onSelect(staff)}
            >
              {staff.name} ({staff.role || "Technician"})
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Define the InvoiceRightColumn component
export const InvoiceRightColumn: React.FC<InvoiceRightColumnProps> = ({
  // Handle both camelCase and snake_case for backward compatibility
  createdBy,
  created_by,
  assignedStaff,
  staffMembers,
  subtotal,
  taxRate,
  tax,
  total,
  showStaffDialog,
  setShowStaffDialog,
  onCreatedByChange,
  onAddStaffMember,
  onRemoveStaffMember,
  onTaxRateChange,
}) => {
  // Use either createdBy or created_by, preferring createdBy if both are provided
  const actualCreatedBy = createdBy !== undefined ? createdBy : created_by;
  
  return (
    <div className="bg-secondary rounded-md p-4 space-y-4">
      {/* Created By */}
      <div>
        <Label htmlFor="createdBy">Created By</Label>
        <Input
          id="createdBy"
          type="text"
          value={actualCreatedBy || ""}
          onChange={(e) => onCreatedByChange(e.target.value)}
        />
      </div>

      {/* Assigned Staff */}
      <div>
        <Label>Assigned Staff</Label>
        <div className="flex items-center space-x-2 mb-2">
          {assignedStaff.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center bg-muted rounded-full px-3 py-1 text-sm"
            >
              <span>{staff.name}</span>
              <XCircle
                className="h-4 w-4 ml-1 cursor-pointer"
                onClick={() => onRemoveStaffMember(staff.id)}
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowStaffDialog(true)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subtotal, Tax Rate, Tax, Total */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tax Details:</span>
          <span className="text-sm">{taxRate.toFixed(2)}% (From Company Settings)</span>
        </div>
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Staff Dialog */}
      <StaffDialog
        open={showStaffDialog}
        onClose={() => setShowStaffDialog(false)}
        staffMembers={staffMembers}
        onSelect={(staff) => {
          onAddStaffMember(staff);
          setShowStaffDialog(false);
        }}
      />
    </div>
  );
};
