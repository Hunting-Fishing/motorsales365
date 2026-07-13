import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { nonprofitApi } from '@/lib/services/nonprofitApi';

interface GrantEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGrantAdded: () => void;
  editingGrant?: any;
}

export function GrantEntryDialog({ 
  open, 
  onOpenChange, 
  onGrantAdded,
  editingGrant 
}: GrantEntryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationDate, setApplicationDate] = useState<Date>();
  const [awardDate, setAwardDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [formData, setFormData] = useState({
    grant_name: editingGrant?.grant_name || '',
    funding_source: editingGrant?.funding_source || '',
    amount_requested: editingGrant?.amount_requested || '',
    amount_awarded: editingGrant?.amount_awarded || '',
    amount_spent: editingGrant?.amount_spent || '0',
    status: editingGrant?.status || 'draft',
    compliance_score: editingGrant?.compliance_score || '100',
    reporting_requirements: editingGrant?.reporting_requirements || ''
  });

  const resetForm = () => {
    setFormData({
      grant_name: '',
      funding_source: '',
      amount_requested: '',
      amount_awarded: '',
      amount_spent: '0',
      status: 'draft',
      compliance_score: '100',
      reporting_requirements: ''
    });
    setApplicationDate(undefined);
    setAwardDate(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grant_name || !formData.funding_source) {
      toast({
        title: "Validation Error",
        description: "Grant name and funding source are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const grantData = {
        ...formData,
        amount_requested: formData.amount_requested ? parseFloat(formData.amount_requested) : null,
        amount_awarded: formData.amount_awarded ? parseFloat(formData.amount_awarded) : null,
        amount_spent: parseFloat(formData.amount_spent),
        compliance_score: parseFloat(formData.compliance_score),
        application_date: applicationDate?.toISOString().split('T')[0],
        award_date: awardDate?.toISOString().split('T')[0],
        start_date: startDate?.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0],
        reporting_requirements: formData.reporting_requirements ? JSON.parse(formData.reporting_requirements) : {}
      };

      if (editingGrant) {
        await nonprofitApi.updateGrant(editingGrant.id, grantData);
        toast({
          title: "Success",
          description: "Grant updated successfully!"
        });
      } else {
        await nonprofitApi.createGrant(grantData);
        toast({
          title: "Success",
          description: "Grant recorded successfully!"
        });
      }

      resetForm();
      onGrantAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving grant:', error);
      toast({
        title: "Error",
        description: "Failed to save grant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingGrant ? 'Edit Grant' : 'Add New Grant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Grant Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grant_name">Grant Name *</Label>
                <Input
                  id="grant_name"
                  value={formData.grant_name}
                  onChange={(e) => setFormData({...formData, grant_name: e.target.value})}
                  placeholder="Enter grant name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="funding_source">Funding Source *</Label>
                <Input
                  id="funding_source"
                  value={formData.funding_source}
                  onChange={(e) => setFormData({...formData, funding_source: e.target.value})}
                  placeholder="Foundation, Government Agency, etc."
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="compliance_score">Compliance Score (%)</Label>
                <Input
                  id="compliance_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.compliance_score}
                  onChange={(e) => setFormData({...formData, compliance_score: e.target.value})}
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount_requested">Amount Requested</Label>
                <Input
                  id="amount_requested"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_requested}
                  onChange={(e) => setFormData({...formData, amount_requested: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="amount_awarded">Amount Awarded</Label>
                <Input
                  id="amount_awarded"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_awarded}
                  onChange={(e) => setFormData({...formData, amount_awarded: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="amount_spent">Amount Spent</Label>
                <Input
                  id="amount_spent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_spent}
                  onChange={(e) => setFormData({...formData, amount_spent: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Important Dates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Application Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !applicationDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {applicationDate ? format(applicationDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={applicationDate}
                      onSelect={setApplicationDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Award Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !awardDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {awardDate ? format(awardDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={awardDate}
                      onSelect={setAwardDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Reporting Requirements */}
          <div>
            <Label htmlFor="reporting_requirements">Reporting Requirements (JSON)</Label>
            <Textarea
              id="reporting_requirements"
              value={formData.reporting_requirements}
              onChange={(e) => setFormData({...formData, reporting_requirements: e.target.value})}
              placeholder='{"quarterly_reports": true, "financial_audits": true, "site_visits": false}'
              rows={3}
            />
            <p className="text-sm text-muted-foreground">Enter JSON format for reporting requirements</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingGrant ? 'Update Grant' : 'Add Grant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}