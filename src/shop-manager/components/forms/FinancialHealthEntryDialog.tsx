import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { nonprofitApi } from '@/lib/services/nonprofitApi';

interface FinancialHealthEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinancialHealthAdded: () => void;
  editingFinancialHealth?: any;
}

export function FinancialHealthEntryDialog({ 
  open, 
  onOpenChange, 
  onFinancialHealthAdded,
  editingFinancialHealth 
}: FinancialHealthEntryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStart, setPeriodStart] = useState<Date>();
  const [periodEnd, setPeriodEnd] = useState<Date>();

  const [formData, setFormData] = useState({
    reporting_period: editingFinancialHealth?.reporting_period || 'monthly',
    total_revenue: editingFinancialHealth?.total_revenue || '',
    donation_revenue: editingFinancialHealth?.donation_revenue || '',
    grant_revenue: editingFinancialHealth?.grant_revenue || '',
    program_revenue: editingFinancialHealth?.program_revenue || '',
    other_revenue: editingFinancialHealth?.other_revenue || '',
    total_expenses: editingFinancialHealth?.total_expenses || '',
    program_expenses: editingFinancialHealth?.program_expenses || '',
    administrative_expenses: editingFinancialHealth?.administrative_expenses || '',
    fundraising_expenses: editingFinancialHealth?.fundraising_expenses || ''
  });

  const resetForm = () => {
    setFormData({
      reporting_period: 'monthly',
      total_revenue: '',
      donation_revenue: '',
      grant_revenue: '',
      program_revenue: '',
      other_revenue: '',
      total_expenses: '',
      program_expenses: '',
      administrative_expenses: '',
      fundraising_expenses: ''
    });
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
  };

  const calculateRatios = () => {
    const totalRevenue = parseFloat(formData.total_revenue) || 0;
    const totalExpenses = parseFloat(formData.total_expenses) || 0;
    const programExpenses = parseFloat(formData.program_expenses) || 0;
    const administrativeExpenses = parseFloat(formData.administrative_expenses) || 0;
    const fundraisingExpenses = parseFloat(formData.fundraising_expenses) || 0;
    const donationRevenue = parseFloat(formData.donation_revenue) || 0;

    const programExpenseRatio = totalExpenses > 0 ? (programExpenses / totalExpenses) * 100 : 0;
    const administrativeRatio = totalExpenses > 0 ? (administrativeExpenses / totalExpenses) * 100 : 0;
    const fundraisingEfficiency = fundraisingExpenses > 0 ? (donationRevenue / fundraisingExpenses) : 0;
    
    // Simple revenue diversification score based on number of revenue streams
    const revenueStreams = [
      parseFloat(formData.donation_revenue) || 0,
      parseFloat(formData.grant_revenue) || 0,
      parseFloat(formData.program_revenue) || 0,
      parseFloat(formData.other_revenue) || 0
    ].filter(stream => stream > 0).length;
    const revenueDiversificationScore = (revenueStreams / 4) * 100;

    // Financial stability score based on revenue to expense ratio
    const financialStabilityScore = totalRevenue > 0 && totalExpenses > 0 ? 
      Math.min((totalRevenue / totalExpenses) * 50, 100) : 0;

    return {
      programExpenseRatio,
      administrativeRatio,
      fundraisingEfficiency,
      revenueDiversificationScore,
      financialStabilityScore
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      toast({
        title: "Validation Error",
        description: "Period start and end dates are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const ratios = calculateRatios();
      
      const financialHealthData = {
        reporting_period: formData.reporting_period,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_revenue: parseFloat(formData.total_revenue) || 0,
        donation_revenue: parseFloat(formData.donation_revenue) || 0,
        grant_revenue: parseFloat(formData.grant_revenue) || 0,
        program_revenue: parseFloat(formData.program_revenue) || 0,
        other_revenue: parseFloat(formData.other_revenue) || 0,
        total_expenses: parseFloat(formData.total_expenses) || 0,
        program_expenses: parseFloat(formData.program_expenses) || 0,
        administrative_expenses: parseFloat(formData.administrative_expenses) || 0,
        fundraising_expenses: parseFloat(formData.fundraising_expenses) || 0,
        program_expense_ratio: ratios.programExpenseRatio,
        administrative_ratio: ratios.administrativeRatio,
        fundraising_efficiency: ratios.fundraisingEfficiency,
        revenue_diversification_score: ratios.revenueDiversificationScore,
        financial_stability_score: ratios.financialStabilityScore
      };

      if (editingFinancialHealth) {
        await nonprofitApi.updateFinancialHealth(editingFinancialHealth.id, financialHealthData);
        toast({
          title: "Success",
          description: "Financial health record updated successfully!"
        });
      } else {
        await nonprofitApi.createFinancialHealth(financialHealthData);
        toast({
          title: "Success",
          description: "Financial health record created successfully!"
        });
      }

      resetForm();
      onFinancialHealthAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving financial health:', error);
      toast({
        title: "Error",
        description: "Failed to save financial health record. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFinancialHealth ? 'Edit Financial Health Record' : 'Add Financial Health Record'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Period Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reporting Period</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="reporting_period">Period Type</Label>
                <Select value={formData.reporting_period} onValueChange={(value) => setFormData({...formData, reporting_period: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Period Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !periodStart && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart ? format(periodStart, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodStart}
                      onSelect={setPeriodStart}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Period End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd ? format(periodEnd, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodEnd}
                      onSelect={setPeriodEnd}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Revenue Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Revenue</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donation_revenue">Donation Revenue</Label>
                <Input
                  id="donation_revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.donation_revenue}
                  onChange={(e) => setFormData({...formData, donation_revenue: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="grant_revenue">Grant Revenue</Label>
                <Input
                  id="grant_revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.grant_revenue}
                  onChange={(e) => setFormData({...formData, grant_revenue: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="program_revenue">Program Revenue</Label>
                <Input
                  id="program_revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.program_revenue}
                  onChange={(e) => setFormData({...formData, program_revenue: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="other_revenue">Other Revenue</Label>
                <Input
                  id="other_revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.other_revenue}
                  onChange={(e) => setFormData({...formData, other_revenue: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="total_revenue">Total Revenue</Label>
                <Input
                  id="total_revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_revenue}
                  onChange={(e) => setFormData({...formData, total_revenue: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Expense Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expenses</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="program_expenses">Program Expenses</Label>
                <Input
                  id="program_expenses"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.program_expenses}
                  onChange={(e) => setFormData({...formData, program_expenses: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="administrative_expenses">Administrative Expenses</Label>
                <Input
                  id="administrative_expenses"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.administrative_expenses}
                  onChange={(e) => setFormData({...formData, administrative_expenses: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="fundraising_expenses">Fundraising Expenses</Label>
                <Input
                  id="fundraising_expenses"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fundraising_expenses}
                  onChange={(e) => setFormData({...formData, fundraising_expenses: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="total_expenses">Total Expenses</Label>
                <Input
                  id="total_expenses"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_expenses}
                  onChange={(e) => setFormData({...formData, total_expenses: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Calculated Ratios Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Calculated Ratios (Preview)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label>Program Expense Ratio</Label>
                <p className="text-2xl font-bold">{calculateRatios().programExpenseRatio.toFixed(1)}%</p>
              </div>

              <div>
                <Label>Administrative Ratio</Label>
                <p className="text-2xl font-bold">{calculateRatios().administrativeRatio.toFixed(1)}%</p>
              </div>

              <div>
                <Label>Fundraising Efficiency</Label>
                <p className="text-2xl font-bold">{calculateRatios().fundraisingEfficiency.toFixed(2)}x</p>
              </div>

              <div>
                <Label>Financial Stability Score</Label>
                <p className="text-2xl font-bold">{calculateRatios().financialStabilityScore.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingFinancialHealth ? 'Update Record' : 'Create Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}