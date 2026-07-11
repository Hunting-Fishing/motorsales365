import React, { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useWaterDeliveryStaff, useAvailableRoles, CreateStaffInput } from '@/hooks/water-delivery/useWaterDeliveryStaff';

interface AddWaterDeliveryStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddWaterDeliveryStaffDialog({
  open,
  onOpenChange,
}: AddWaterDeliveryStaffDialogProps) {
  const { createStaff, isCreating } = useWaterDeliveryStaff();
  const { data: roles = [] } = useAvailableRoles();
  
  const [formData, setFormData] = useState<CreateStaffInput>({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    role_id: '',
    send_invitation: false,
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createStaff({
        ...formData,
        password: usePassword ? formData.password : undefined,
        send_invitation: formData.send_invitation || usePassword,
      });
      
      // Reset form and close
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        phone: '',
        job_title: '',
        department: '',
        role_id: '',
        send_invitation: false,
        password: '',
      });
      setUsePassword(false);
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleChange = (field: keyof CreateStaffInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Roles are already filtered by useAvailableRoles hook for water delivery module
  const waterDeliveryRoles = roles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-500" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Create a new staff member for your water delivery team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name (Optional)</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) => handleChange('middle_name', e.target.value)}
              placeholder="Michael"
            />
          </div>

          {/* Contact Fields */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john.doe@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Job Title & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
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
              <Label htmlFor="department">Department</Label>
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

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Assign Role</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) => handleChange('role_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {waterDeliveryRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex flex-col">
                      <span className="capitalize">{role.name.replace('_', ' ')}</span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">
                          {role.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Login Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Set Password Now</Label>
                <p className="text-xs text-muted-foreground">
                  Create a password instead of sending an invitation email
                </p>
              </div>
              <Switch
                checked={usePassword}
                onCheckedChange={setUsePassword}
              />
            </div>

            {usePassword ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create a secure password"
                    required={usePassword}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Share this password securely with the staff member.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send Invitation Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Send a login invitation to their email address
                  </p>
                </div>
                <Switch
                  checked={formData.send_invitation}
                  onCheckedChange={(checked) => handleChange('send_invitation', checked)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.first_name || !formData.last_name || !formData.email}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Staff Member
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
