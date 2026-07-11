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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface CreatePayPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreatePayPeriodDialog({ open, onOpenChange, onCreated }: CreatePayPeriodDialogProps) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [periodType, setPeriodType] = useState('biweekly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 13), 'yyyy-MM-dd'));

  const handlePeriodTypeChange = (type: string) => {
    setPeriodType(type);
    const start = new Date(startDate);
    
    switch (type) {
      case 'weekly':
        setEndDate(format(addDays(start, 6), 'yyyy-MM-dd'));
        break;
      case 'biweekly':
        setEndDate(format(addDays(start, 13), 'yyyy-MM-dd'));
        break;
      case 'monthly':
        setEndDate(format(endOfMonth(start), 'yyyy-MM-dd'));
        break;
      case 'semimonthly':
        if (start.getDate() <= 15) {
          setEndDate(format(new Date(start.getFullYear(), start.getMonth(), 15), 'yyyy-MM-dd'));
        } else {
          setEndDate(format(endOfMonth(start), 'yyyy-MM-dd'));
        }
        break;
    }
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    const start = new Date(date);
    
    switch (periodType) {
      case 'weekly':
        setEndDate(format(addDays(start, 6), 'yyyy-MM-dd'));
        break;
      case 'biweekly':
        setEndDate(format(addDays(start, 13), 'yyyy-MM-dd'));
        break;
      case 'monthly':
        setEndDate(format(endOfMonth(start), 'yyyy-MM-dd'));
        break;
      case 'semimonthly':
        if (start.getDate() <= 15) {
          setEndDate(format(new Date(start.getFullYear(), start.getMonth(), 15), 'yyyy-MM-dd'));
        } else {
          setEndDate(format(endOfMonth(start), 'yyyy-MM-dd'));
        }
        break;
    }
  };

  const handleCreate = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pay_periods')
        .insert({
          shop_id: shopId,
          period_name: name || `Pay Period ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d')}`,
          start_date: startDate,
          end_date: endDate,
          status: 'open',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Pay period created successfully',
      });
      
      // Reset form
      setName('');
      setPeriodType('biweekly');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 13), 'yyyy-MM-dd'));
      
      onCreated();
    } catch (error: any) {
      console.error('Error creating pay period:', error);
      toast({
        title: 'Error',
        description: 'Failed to create pay period',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Pay Period</DialogTitle>
          <DialogDescription>
            Set up a new pay period for tracking employee time
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Period Name (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., December 2024 - Period 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="periodType">Period Type</Label>
            <Select value={periodType} onValueChange={handlePeriodTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly (14 days)</SelectItem>
                <SelectItem value="semimonthly">Semi-Monthly (1st-15th, 16th-end)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
