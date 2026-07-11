import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ToolCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: any;
  onSuccess: () => void;
}

export function ToolCheckoutDialog({ open, onOpenChange, tool, onSuccess }: ToolCheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    checked_out_to: '',
    equipment_id: '',
    expected_return_date: '',
    notes: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool) return;

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile for shop_id and name - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, full_name')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop ID not found');

      // Create checkout record
      const { error: checkoutError } = await supabase
        .from('tool_checkout_history')
        .insert({
          tool_id: tool.id,
          assigned_to_person_name: checkoutData.checked_out_to,
          assigned_to_equipment_id: checkoutData.equipment_id || null,
          checked_out_by: user.id,
          checked_out_by_name: profile.full_name || user.email || 'Unknown',
          checked_out_at: new Date().toISOString(),
          notes: checkoutData.notes || null,
          shop_id: profile.shop_id,
        });

      if (checkoutError) throw checkoutError;

      // Update tool status
      const { error: updateError } = await supabase
        .from('tools')
        .update({ status: 'in_use' })
        .eq('id', tool.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Tool checked out successfully',
      });

      setCheckoutData({
        checked_out_to: '',
        equipment_id: '',
        expected_return_date: '',
        notes: '',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout Tool: {tool?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="checked_out_to">Checked Out To *</Label>
            <Input
              id="checked_out_to"
              value={checkoutData.checked_out_to}
              onChange={(e) => setCheckoutData({ ...checkoutData, checked_out_to: e.target.value })}
              placeholder="Person or department name"
              required
            />
          </div>

          <div>
            <Label htmlFor="equipment_id">Equipment ID (Optional)</Label>
            <Input
              id="equipment_id"
              value={checkoutData.equipment_id}
              onChange={(e) => setCheckoutData({ ...checkoutData, equipment_id: e.target.value })}
              placeholder="Associated equipment"
            />
          </div>

          <div>
            <Label htmlFor="expected_return_date">Expected Return Date</Label>
            <Input
              id="expected_return_date"
              type="date"
              value={checkoutData.expected_return_date}
              onChange={(e) => setCheckoutData({ ...checkoutData, expected_return_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={checkoutData.notes}
              onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Checking Out...' : 'Checkout Tool'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
