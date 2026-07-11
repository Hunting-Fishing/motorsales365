
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StaffMember } from '@/types/invoice';

interface StaffSelectorProps {
  isOpen: boolean; // Changed from 'open' to 'isOpen'
  onClose: () => void;
  staffMembers: StaffMember[];
  onAddStaffMember: (staff: StaffMember) => void;
}

export function StaffSelector({
  isOpen,
  onClose,
  staffMembers,
  onAddStaffMember
}: StaffSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staffMembers.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectStaff = (staff: StaffMember) => {
    onAddStaffMember(staff);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Team Member</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <input
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredStaff.length === 0 ? (
              <p className="text-center text-slate-500 p-4">No team members found</p>
            ) : (
              filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleSelectStaff(staff)}
                >
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    {staff.role && <p className="text-xs text-slate-500">{staff.role}</p>}
                  </div>
                  <Button variant="ghost" size="sm">Select</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
