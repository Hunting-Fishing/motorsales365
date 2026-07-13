
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onInteractionAdded: () => void;
}

export function AddInteractionDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onInteractionAdded
}: AddInteractionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    notes: '',
    followUpDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Here you would typically save the interaction to your database
      console.log('Adding interaction:', { customerId, ...formData });
      
      toast({
        title: "Interaction added",
        description: `Interaction has been recorded for ${customerName}`
      });

      onInteractionAdded();
      setFormData({ type: '', notes: '', followUpDate: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add interaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Interaction - {customerName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Interaction Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">In-Person Meeting</SelectItem>
                <SelectItem value="service">Service Discussion</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter interaction details..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Date (optional)</Label>
            <Input
              id="followUpDate"
              type="datetime-local"
              value={formData.followUpDate}
              onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Interaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
