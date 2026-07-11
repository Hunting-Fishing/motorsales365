import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ToolMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: any;
  onSuccess: () => void;
}

export function ToolMaintenanceDialog({ open, onOpenChange, tool, onSuccess }: ToolMaintenanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    maintenance_type: 'routine',
    description: '',
    cost: '',
    next_maintenance_date: '',
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

      // Create maintenance record
      const { error: maintenanceError } = await supabase
        .from('tool_maintenance')
        .insert({
          tool_id: tool.id,
          maintenance_date: new Date().toISOString(),
          maintenance_type: maintenanceData.maintenance_type,
          description: maintenanceData.description,
          total_cost: maintenanceData.cost ? parseFloat(maintenanceData.cost) : null,
          performed_by: user.id,
          performed_by_name: profile.full_name || user.email || 'Unknown',
          next_maintenance_date: maintenanceData.next_maintenance_date || null,
          shop_id: profile.shop_id,
        });

      if (maintenanceError) throw maintenanceError;

      // Update tool status to maintenance temporarily
      const { error: updateError } = await supabase
        .from('tools')
        .update({ 
          status: 'maintenance',
          last_maintenance_date: new Date().toISOString(),
          next_maintenance_date: maintenanceData.next_maintenance_date || null,
        })
        .eq('id', tool.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Maintenance record created successfully',
      });

      setMaintenanceData({
        maintenance_type: 'routine',
        description: '',
        cost: '',
        next_maintenance_date: '',
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
          <DialogTitle>Schedule Maintenance: {tool?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="maintenance_type">Maintenance Type *</Label>
            <Select
              value={maintenanceData.maintenance_type}
              onValueChange={(value) => setMaintenanceData({ ...maintenanceData, maintenance_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="calibration">Calibration</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={maintenanceData.description}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
              placeholder="Describe the maintenance work..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={maintenanceData.cost}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="next_maintenance_date">Next Maintenance Date</Label>
            <Input
              id="next_maintenance_date"
              type="date"
              value={maintenanceData.next_maintenance_date}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, next_maintenance_date: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Schedule Maintenance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
