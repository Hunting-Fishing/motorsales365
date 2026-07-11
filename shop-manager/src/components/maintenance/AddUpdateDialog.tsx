import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface AddUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceRequestId: string;
  shopId: string;
  onUpdate: () => void;
}

interface PartOrder {
  part_number: string;
  name: string;
  quantity: number;
  supplier: string;
  order_date: string;
  expected_arrival: string;
  status: string;
  cost: number;
}

export function AddUpdateDialog({ 
  open, 
  onOpenChange, 
  maintenanceRequestId,
  shopId,
  onUpdate 
}: AddUpdateDialogProps) {
  const [updateType, setUpdateType] = useState<string>('comment');
  const [updateText, setUpdateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partsOrdered, setPartsOrdered] = useState<PartOrder[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [attentionTo, setAttentionTo] = useState('');

  // Fetch staff members for assignments
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-members', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId);
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleAddPart = () => {
    setPartsOrdered([...partsOrdered, {
      part_number: '',
      name: '',
      quantity: 1,
      supplier: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_arrival: '',
      status: 'ordered',
      cost: 0
    }]);
  };

  const handleRemovePart = (index: number) => {
    setPartsOrdered(partsOrdered.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof PartOrder, value: any) => {
    const updated = [...partsOrdered];
    updated[index] = { ...updated[index], [field]: value };
    setPartsOrdered(updated);
  };

  const handleSubmit = async () => {
    if (!updateText && partsOrdered.length === 0 && !assignedTo) {
      toast.error('Please provide some update information');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userData.user?.id)
        .single();

      const assignedToProfile = assignedTo ? staffMembers?.find(s => s.id === assignedTo) : null;
      const attentionToProfile = attentionTo ? staffMembers?.find(s => s.id === attentionTo) : null;

      const { error } = await supabase
        .from('maintenance_request_updates' as any)
        .insert({
          maintenance_request_id: maintenanceRequestId,
          shop_id: shopId,
          update_type: updateType,
          update_text: updateText || null,
          created_by: userData.user?.id,
          created_by_name: `${profile?.first_name} ${profile?.last_name}`.trim(),
          parts_ordered: partsOrdered.length > 0 ? partsOrdered : null,
          assigned_to: assignedTo || null,
          assigned_to_name: assignedToProfile ? `${assignedToProfile.first_name} ${assignedToProfile.last_name}`.trim() : null,
          attention_to: attentionTo || null,
          attention_to_name: attentionToProfile ? `${attentionToProfile.first_name} ${attentionToProfile.last_name}`.trim() : null
        });

      if (error) throw error;

      toast.success('Update added successfully');
      setUpdateText('');
      setPartsOrdered([]);
      setAssignedTo('');
      setAttentionTo('');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding update:', error);
      toast.error(error.message || 'Failed to add update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Update Type</Label>
            <Select value={updateType} onValueChange={setUpdateType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comment">Comment</SelectItem>
                <SelectItem value="parts_ordered">Parts Ordered</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="arrival_update">Arrival Update</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Update / Notes</Label>
            <Textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Enter update details..."
              rows={3}
            />
          </div>

          {updateType === 'parts_ordered' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parts Ordered</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddPart}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Part
                </Button>
              </div>
              
              {partsOrdered.map((part, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Part {index + 1}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePart(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Part Number"
                      value={part.part_number}
                      onChange={(e) => handlePartChange(index, 'part_number', e.target.value)}
                    />
                    <Input
                      placeholder="Part Name"
                      value={part.name}
                      onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={part.quantity}
                      onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                    <Input
                      placeholder="Supplier"
                      value={part.supplier}
                      onChange={(e) => handlePartChange(index, 'supplier', e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Expected Arrival"
                      value={part.expected_arrival}
                      onChange={(e) => handlePartChange(index, 'expected_arrival', e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Cost"
                      value={part.cost}
                      onChange={(e) => handlePartChange(index, 'cost', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {updateType === 'assignment' && staffMembers && (
            <div>
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Attention To (Optional)</Label>
            <Select value={attentionTo} onValueChange={setAttentionTo}>
              <SelectTrigger>
                <SelectValue placeholder="Notify specific person..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {staffMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
