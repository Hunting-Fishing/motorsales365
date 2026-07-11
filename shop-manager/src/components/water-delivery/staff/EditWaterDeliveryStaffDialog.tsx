import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserCog } from 'lucide-react';
import { useWaterDeliveryStaff, WaterDeliveryStaffMember } from '@/hooks/water-delivery/useWaterDeliveryStaff';

interface EditWaterDeliveryStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: WaterDeliveryStaffMember | null;
}

const departments = [
  'Operations',
  'Dispatch',
  'Delivery',
  'Administration',
  'Sales',
  'Maintenance',
];

const jobTitles = [
  'Truck Driver',
  'Dispatcher',
  'Operations Manager',
  'Sales Representative',
  'Office Administrator',
  'Receptionist',
  'Maintenance Technician',
  'Route Supervisor',
  'Customer Service Rep',
  'Yard Manager',
];

export function EditWaterDeliveryStaffDialog({
  open,
  onOpenChange,
  staff,
}: EditWaterDeliveryStaffDialogProps) {
  const { updateStaff, isUpdating } = useWaterDeliveryStaff();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
  });

  // Update form when staff changes
  useEffect(() => {
    if (staff) {
      setFormData({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        middle_name: staff.middle_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        job_title: staff.job_title || '',
        department: staff.department || '',
      });
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staff) return;
    
    try {
      await updateStaff({
        id: staff.id,
        ...formData,
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-cyan-500" />
            Edit Staff Member
          </DialogTitle>
          <DialogDescription>
            Update details for {staff.first_name} {staff.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_middle_name">Middle Name</Label>
            <Input
              id="edit_middle_name"
              value={formData.middle_name}
              onChange={(e) => handleChange('middle_name', e.target.value)}
            />
          </div>

          {/* Contact Fields */}
          <div className="space-y-2">
            <Label htmlFor="edit_email">Email Address *</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone">Phone Number</Label>
            <Input
              id="edit_phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          {/* Job Title & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_job_title">Job Title</Label>
              <Select
                value={formData.job_title}
                onValueChange={(value) => handleChange('job_title', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {jobTitles.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleChange('department', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dept" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || !formData.first_name || !formData.last_name || !formData.email}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
