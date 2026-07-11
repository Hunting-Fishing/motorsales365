
import { useState } from "react";
import { StaffMember } from "@/types/invoice";

export function useInvoiceStaff(initialStaff: StaffMember[] = []) {
  const [assignedStaff, setAssignedStaff] = useState<StaffMember[]>(initialStaff);

  // Handle adding staff member
  const handleAddStaffMember = (staffMember: StaffMember) => {
    const exists = assignedStaff.some(staff => staff.id === staffMember.id);
    if (!exists) {
      setAssignedStaff([...assignedStaff, staffMember]);
    }
  };

  // Handle removing staff member
  const handleRemoveStaffMember = (staffId: string) => {
    setAssignedStaff(assignedStaff.filter(staff => staff.id !== staffId));
  };

  return {
    assignedStaff,
    setAssignedStaff,
    handleAddStaffMember,
    handleRemoveStaffMember
  };
}
