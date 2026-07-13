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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { Loader2, GraduationCap } from 'lucide-react';
import { TRAINING_TYPE_LABELS, TrainingType } from '@/types/safety';

interface TrainingAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staffOptions: { id: string; name: string }[];
  preSelectedStaffId?: string;
}

export function TrainingAcknowledgmentDialog({
  open,
  onOpenChange,
  onSuccess,
  staffOptions,
  preSelectedStaffId
}: TrainingAcknowledgmentDialogProps) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: preSelectedStaffId || '',
    training_type: '' as TrainingType | '',
    training_topic: '',
    expiry_date: '',
    notes: ''
  });

  // Update staff_id when preSelectedStaffId changes
  React.useEffect(() => {
    if (preSelectedStaffId) {
      setFormData(prev => ({ ...prev, staff_id: preSelectedStaffId }));
    }
  }, [preSelectedStaffId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staff_id || !formData.training_type || !formData.training_topic) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!shopId) {
      toast({
        title: 'Error',
        description: 'Shop not found',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase
        .from('safety_training_acknowledgments' as any)
        .insert({
          shop_id: shopId,
          staff_id: formData.staff_id,
          training_type: formData.training_type,
          training_topic: formData.training_topic,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes || null,
          acknowledged_at: new Date().toISOString()
        }) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training acknowledgment recorded'
      });

      setFormData({
        staff_id: '',
        training_type: '',
        training_topic: '',
        expiry_date: '',
        notes: ''
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error recording acknowledgment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record acknowledgment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Record Training Acknowledgment
          </DialogTitle>
          <DialogDescription>
            Document staff training completion and safety acknowledgments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_id">Staff Member *</Label>
            <Select
              value={formData.staff_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, staff_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="training_type">Training Type *</Label>
            <Select
              value={formData.training_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, training_type: value as TrainingType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select training type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="training_topic">Training Topic *</Label>
            <Input
              id="training_topic"
              value={formData.training_topic}
              onChange={(e) => setFormData(prev => ({ ...prev, training_topic: e.target.value }))}
              placeholder="e.g., Quarterly Safety Review, New Equipment Training"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Set if this training needs to be renewed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about the training"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Acknowledgment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}