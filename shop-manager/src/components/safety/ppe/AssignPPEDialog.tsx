import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { usePPEManagement } from '@/hooks/usePPEManagement';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface AssignPPEDialogProps {
  trigger?: React.ReactNode;
}

export const AssignPPEDialog = ({ trigger }: AssignPPEDialogProps) => {
  const [open, setOpen] = useState(false);
  const { inventory, createAssignment } = usePPEManagement();
  const { teamMembers } = useTeamMembers();
  const [formData, setFormData] = useState({
    ppe_item_id: '',
    employee_id: '',
    quantity: 1,
    serial_number: '',
    condition: 'new',
    expiry_date: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAssignment.mutateAsync({
      ...formData,
      expiry_date: formData.expiry_date || undefined,
    });
    setOpen(false);
    setFormData({
      ppe_item_id: '',
      employee_id: '',
      quantity: 1,
      serial_number: '',
      condition: 'new',
      expiry_date: '',
      notes: '',
    });
  };

  const activeInventory = inventory.filter((item) => item.is_active && item.quantity_in_stock > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign PPE
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign PPE to Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>PPE Item *</Label>
            <Select
              value={formData.ppe_item_id}
              onValueChange={(value) => setFormData({ ...formData, ppe_item_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PPE item" />
              </SelectTrigger>
              <SelectContent>
                {activeInventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity_in_stock} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Employee *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Serial Number (optional)</Label>
            <Input
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            />
          </div>
          <div>
            <Label>Expiry Date (optional)</Label>
            <Input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAssignment.isPending || !formData.ppe_item_id || !formData.employee_id}
            >
              {createAssignment.isPending ? 'Assigning...' : 'Assign PPE'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
