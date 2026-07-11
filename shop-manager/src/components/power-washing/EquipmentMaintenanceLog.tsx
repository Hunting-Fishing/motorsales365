import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Wrench, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MaintenanceLog {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  performed_by: string | null;
  performed_date: string;
  cost: number | null;
  parts_used: string[] | null;
  notes: string | null;
  next_due_date: string | null;
  next_due_hours: number | null;
  created_at: string;
}

interface EquipmentMaintenanceLogProps {
  equipmentId: string;
  shopId: string;
  onUpdate?: () => void;
}

const MAINTENANCE_TYPES = [
  'Oil Change',
  'Filter Replacement',
  'Pump Service',
  'Hose Replacement',
  'Nozzle Replacement',
  'General Inspection',
  'Winterization',
  'Full Service',
  'Repair',
  'Other',
];

export function EquipmentMaintenanceLog({ equipmentId, shopId, onUpdate }: EquipmentMaintenanceLogProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [maintenanceType, setMaintenanceType] = useState('');
  const [performedDate, setPerformedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cost, setCost] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [equipmentId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('power_washing_maintenance_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('performed_date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch maintenance logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!maintenanceType) {
      toast.error('Please select a maintenance type');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('power_washing_maintenance_logs')
        .insert({
          equipment_id: equipmentId,
          shop_id: shopId,
          maintenance_type: maintenanceType,
          performed_by: user?.id || null,
          performed_date: performedDate,
          cost: cost ? parseFloat(cost) : null,
          parts_used: partsUsed ? partsUsed.split(',').map(p => p.trim()) : null,
          notes: notes || null,
          next_due_date: nextDueDate || null,
        });

      if (error) throw error;

      // Update equipment's last/next maintenance dates
      await supabase
        .from('power_washing_equipment')
        .update({
          last_maintenance_date: performedDate,
          next_maintenance_date: nextDueDate || null,
        })
        .eq('id', equipmentId);

      toast.success('Maintenance logged successfully');
      resetForm();
      setIsDialogOpen(false);
      fetchLogs();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to log maintenance:', error);
      toast.error('Failed to log maintenance');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setMaintenanceType('');
    setPerformedDate(format(new Date(), 'yyyy-MM-dd'));
    setCost('');
    setPartsUsed('');
    setNotes('');
    setNextDueDate('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance History
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Maintenance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Maintenance Type *</Label>
                  <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Performed *</Label>
                    <Input
                      type="date"
                      value={performedDate}
                      onChange={(e) => setPerformedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Parts Used (comma separated)</Label>
                  <Input
                    placeholder="Oil, Filter, Gasket..."
                    value={partsUsed}
                    onChange={(e) => setPartsUsed(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No maintenance records yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div 
                key={log.id} 
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{log.maintenance_type}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.performed_date), 'MMM d, yyyy')}
                      </span>
                      {log.cost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {log.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {log.next_due_date && (
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">Next due</p>
                      <p className="font-medium">{format(new Date(log.next_due_date), 'MMM d')}</p>
                    </div>
                  )}
                </div>
                {log.parts_used && log.parts_used.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Parts: {log.parts_used.join(', ')}
                  </p>
                )}
                {log.notes && (
                  <p className="text-sm mt-2 text-muted-foreground">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
