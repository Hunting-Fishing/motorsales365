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
import { Plus, Trash2, Droplets, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePowerWashingChemicals, PowerWashingChemical } from '@/hooks/usePowerWashing';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChemicalUsage {
  id: string;
  job_id: string;
  chemical_id: string;
  quantity_used: number;
  unit_of_measure: string;
  cost_at_use: number | null;
  notes: string | null;
  created_at: string;
  chemical?: PowerWashingChemical;
}

interface ChemicalUsageLoggerProps {
  jobId: string;
  shopId: string;
  onUpdate?: () => void;
}

export function ChemicalUsageLogger({ jobId, shopId, onUpdate }: ChemicalUsageLoggerProps) {
  const { data: chemicals } = usePowerWashingChemicals();
  const [usages, setUsages] = useState<ChemicalUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [selectedChemical, setSelectedChemical] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchUsages();
  }, [jobId]);

  const fetchUsages = async () => {
    try {
      const { data, error } = await supabase
        .from('power_washing_job_chemicals')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with chemical data
      const enriched = (data || []).map(usage => ({
        ...usage,
        chemical: chemicals?.find(c => c.id === usage.chemical_id)
      }));
      
      setUsages(enriched);
    } catch (error) {
      console.error('Failed to fetch chemical usages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedChemical || !quantity) {
      toast.error('Please select a chemical and enter quantity');
      return;
    }

    const chemical = chemicals?.find(c => c.id === selectedChemical);
    if (!chemical) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('power_washing_job_chemicals')
        .insert({
          job_id: jobId,
          shop_id: shopId,
          chemical_id: selectedChemical,
          quantity_used: parseFloat(quantity),
          unit_of_measure: chemical.unit_of_measure,
          cost_at_use: chemical.cost_per_unit ? chemical.cost_per_unit * parseFloat(quantity) : null,
          notes: notes || null,
        });

      if (error) throw error;

      // Update chemical inventory
      const newQuantity = chemical.current_quantity - parseFloat(quantity);
      await supabase
        .from('power_washing_chemicals')
        .update({ current_quantity: Math.max(0, newQuantity) })
        .eq('id', selectedChemical);

      toast.success('Chemical usage logged');
      setSelectedChemical('');
      setQuantity('');
      setNotes('');
      fetchUsages();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to log chemical usage:', error);
      toast.error('Failed to log chemical usage');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (usageId: string, chemicalId: string, quantityUsed: number) => {
    try {
      const { error } = await supabase
        .from('power_washing_job_chemicals')
        .delete()
        .eq('id', usageId);

      if (error) throw error;

      // Restore inventory
      const chemical = chemicals?.find(c => c.id === chemicalId);
      if (chemical) {
        await supabase
          .from('power_washing_chemicals')
          .update({ current_quantity: chemical.current_quantity + quantityUsed })
          .eq('id', chemicalId);
      }

      toast.success('Usage removed and inventory restored');
      fetchUsages();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove usage:', error);
      toast.error('Failed to remove usage');
    }
  };

  const totalCost = usages.reduce((sum, u) => sum + (u.cost_at_use || 0), 0);

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
    <div className="space-y-4">
      {/* Add Chemical Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Log Chemical Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Chemical</Label>
              <Select value={selectedChemical} onValueChange={setSelectedChemical}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chemical" />
                </SelectTrigger>
                <SelectContent>
                  {chemicals?.filter(c => c.is_active).map(chem => (
                    <SelectItem key={chem.id} value={chem.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{chem.name}</span>
                        {chem.reorder_level && chem.current_quantity <= chem.reorder_level && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Amount used"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAdd} 
                disabled={isAdding || !selectedChemical || !quantity}
                className="w-full"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              placeholder="Any notes about usage..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage List */}
      {usages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Chemicals Used</CardTitle>
              <span className="text-sm font-medium">${totalCost.toFixed(2)} total</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {usages.map(usage => (
                <div 
                  key={usage.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {usage.chemical?.name || 'Unknown Chemical'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {usage.quantity_used} {usage.unit_of_measure}
                      {usage.notes && ` • ${usage.notes}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(usage.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {usage.cost_at_use && (
                      <span className="text-sm font-medium">${usage.cost_at_use.toFixed(2)}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(usage.id, usage.chemical_id, usage.quantity_used)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
