import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetCategory, BudgetEntry } from '@/hooks/useBudgetData';
import { toast } from 'sonner';

interface BudgetEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  fiscalYear: number;
  onSubmit: (data: Partial<BudgetEntry>) => Promise<void>;
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const QUARTERS = [
  { value: '1', label: 'Q1 (Jan-Mar)' },
  { value: '2', label: 'Q2 (Apr-Jun)' },
  { value: '3', label: 'Q3 (Jul-Sep)' },
  { value: '4', label: 'Q4 (Oct-Dec)' }
];

export function BudgetEntryForm({ 
  open, 
  onOpenChange, 
  categories, 
  fiscalYear,
  onSubmit 
}: BudgetEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    budget_type: 'monthly',
    month: '',
    quarter: '',
    planned_amount: '',
    actual_amount: '',
    notes: ''
  });

  const handleSubmit = async () => {
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }

    if (!formData.planned_amount) {
      toast.error('Please enter a planned amount');
      return;
    }

    if (formData.budget_type === 'monthly' && !formData.month) {
      toast.error('Please select a month');
      return;
    }

    if (formData.budget_type === 'quarterly' && !formData.quarter) {
      toast.error('Please select a quarter');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        category_id: formData.category_id,
        fiscal_year: fiscalYear,
        budget_type: formData.budget_type,
        month: formData.budget_type === 'monthly' ? parseInt(formData.month) : null,
        quarter: formData.budget_type === 'quarterly' ? parseInt(formData.quarter) : null,
        planned_amount: parseFloat(formData.planned_amount),
        actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : 0,
        notes: formData.notes || null
      });

      toast.success('Budget entry added');
      setFormData({
        category_id: '',
        budget_type: 'monthly',
        month: '',
        quarter: '',
        planned_amount: '',
        actual_amount: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error creating entry:', err);
      toast.error('Failed to create budget entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Budget Entry</DialogTitle>
          <DialogDescription>
            Create a new budget entry for FY {fiscalYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(v) => setFormData({ ...formData, category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Budget Type</Label>
            <Select 
              value={formData.budget_type} 
              onValueChange={(v) => setFormData({ ...formData, budget_type: v, month: '', quarter: '' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.budget_type === 'monthly' && (
            <div className="space-y-2">
              <Label>Month *</Label>
              <Select 
                value={formData.month} 
                onValueChange={(v) => setFormData({ ...formData, month: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.budget_type === 'quarterly' && (
            <div className="space-y-2">
              <Label>Quarter *</Label>
              <Select 
                value={formData.quarter} 
                onValueChange={(v) => setFormData({ ...formData, quarter: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Amount *</Label>
              <Input
                type="number"
                value={formData.planned_amount}
                onChange={(e) => setFormData({ ...formData, planned_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Actual Amount</Label>
              <Input
                type="number"
                value={formData.actual_amount}
                onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
