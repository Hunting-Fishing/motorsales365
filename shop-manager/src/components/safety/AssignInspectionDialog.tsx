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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface AssignInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId?: string;
  scheduleName?: string;
  onAssigned?: () => void;
}

const INSPECTION_TYPES = [
  { value: 'daily_inspection', label: 'Daily Shop Inspection' },
  { value: 'lift_inspection', label: 'Lift/Hoist Inspection' },
  { value: 'fire_safety', label: 'Fire Safety Check' },
  { value: 'ppe_check', label: 'PPE Inspection' },
  { value: 'equipment_check', label: 'Equipment Check' },
  { value: 'dvir', label: 'Vehicle DVIR' },
];

const SHIFTS = [
  { value: 'morning', label: 'Morning (6AM-2PM)' },
  { value: 'afternoon', label: 'Afternoon (2PM-10PM)' },
  { value: 'night', label: 'Night (10PM-6AM)' },
];

export function AssignInspectionDialog({
  open,
  onOpenChange,
  scheduleId,
  scheduleName,
  onAssigned
}: AssignInspectionDialogProps) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [formData, setFormData] = useState({
    staff_id: '',
    inspection_type: 'daily_inspection',
    shift: 'morning',
    assignment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (open && shopId) {
      fetchStaffMembers();
    }
  }, [open, shopId]);

  const fetchStaffMembers = async () => {
    if (!shopId) return;
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId)
        .order('first_name');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSubmit = async () => {
    if (!shopId || !formData.staff_id) return;

    setLoading(true);
    try {
      const { error } = await (supabase
        .from('inspection_assignments' as any)
        .insert({
          shop_id: shopId,
          staff_id: formData.staff_id,
          schedule_id: scheduleId || null,
          inspection_type: formData.inspection_type,
          shift: formData.shift,
          assignment_date: formData.assignment_date,
          notes: formData.notes || null,
          is_completed: false
        }) as any);

      if (error) throw error;

      toast({
        title: 'Assignment Created',
        description: 'Staff member has been assigned to the inspection.'
      });

      onOpenChange(false);
      onAssigned?.();
      resetForm();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      inspection_type: 'daily_inspection',
      shift: 'morning',
      assignment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Staff to Inspection
          </DialogTitle>
          <DialogDescription>
            {scheduleName 
              ? `Assign a staff member to: ${scheduleName}`
              : 'Create a new inspection assignment for a staff member'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            <Select
              value={formData.staff_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, staff_id: value }))}
              disabled={loadingStaff}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStaff ? 'Loading...' : 'Select staff member'} />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inspection Type</Label>
            <Select
              value={formData.inspection_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, inspection_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select
                value={formData.shift}
                onValueChange={(value) => setFormData(prev => ({ ...prev, shift: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((shift) => (
                    <SelectItem key={shift.value} value={shift.value}>
                      {shift.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.assignment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, assignment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.staff_id}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
