import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { hybridActivitiesService } from "@/services/hybridActivitiesService";
import { HybridActivity, CreateHybridActivityData } from "@/types/hybrid";

interface HybridActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: HybridActivity;
  onSuccess: () => void;
}

export function HybridActivityForm({ open, onOpenChange, activity, onSuccess }: HybridActivityFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    activity?.start_date ? new Date(activity.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    activity?.end_date ? new Date(activity.end_date) : undefined
  );

  const [formData, setFormData] = useState<CreateHybridActivityData>({
    activity_name: activity?.activity_name || '',
    activity_type: activity?.activity_type || '',
    description: activity?.description || '',
    for_profit_percentage: activity?.for_profit_percentage || 50,
    non_profit_percentage: activity?.non_profit_percentage || 50,
    status: activity?.status || 'active',
    revenue_for_profit: activity?.revenue_for_profit || 0,
    revenue_non_profit: activity?.revenue_non_profit || 0,
    expenses_for_profit: activity?.expenses_for_profit || 0,
    expenses_non_profit: activity?.expenses_non_profit || 0,
    participants_count: activity?.participants_count || 0,
    beneficiaries_count: activity?.beneficiaries_count || 0,
    volunteer_hours: activity?.volunteer_hours || 0,
    compliance_notes: activity?.compliance_notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate percentage allocation
    if (formData.for_profit_percentage + formData.non_profit_percentage !== 100) {
      toast({
        title: "Invalid Allocation",
        description: "For-profit and non-profit percentages must total 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const activityData = {
        ...formData,
        start_date: startDate?.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0],
      };

      if (activity) {
        await hybridActivitiesService.updateActivity(activity.id, activityData);
        toast({
          title: "Activity Updated",
          description: "Hybrid activity has been updated successfully.",
        });
      } else {
        await hybridActivitiesService.createActivity(activityData);
        toast({
          title: "Activity Created",
          description: "Hybrid activity has been created successfully.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (field: 'for_profit_percentage' | 'non_profit_percentage', value: number) => {
    const otherField = field === 'for_profit_percentage' ? 'non_profit_percentage' : 'for_profit_percentage';
    const otherValue = 100 - value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
      [otherField]: otherValue
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Edit Hybrid Activity' : 'Create Hybrid Activity'}
          </DialogTitle>
          <DialogDescription>
            {activity 
              ? 'Update the details of this hybrid activity'
              : 'Create a new activity that serves both for-profit and non-profit purposes'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activity_name">Activity Name *</Label>
                <Input
                  id="activity_name"
                  value={formData.activity_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity_name: e.target.value }))}
                  placeholder="Enter activity name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="activity_type">Activity Type *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="training">Training Program</SelectItem>
                    <SelectItem value="consulting">Consulting Service</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="product_sales">Product Sales</SelectItem>
                    <SelectItem value="service_delivery">Service Delivery</SelectItem>
                    <SelectItem value="research">Research Project</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the activity and its dual purpose"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Revenue Allocation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Revenue Allocation</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="for_profit_percentage">For-Profit Percentage *</Label>
                <Input
                  id="for_profit_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.for_profit_percentage}
                  onChange={(e) => handlePercentageChange('for_profit_percentage', Number(e.target.value))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="non_profit_percentage">Non-Profit Percentage *</Label>
                <Input
                  id="non_profit_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.non_profit_percentage}
                  onChange={(e) => handlePercentageChange('non_profit_percentage', Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue_for_profit">For-Profit Revenue ($)</Label>
                <Input
                  id="revenue_for_profit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.revenue_for_profit}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenue_for_profit: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="revenue_non_profit">Non-Profit Revenue ($)</Label>
                <Input
                  id="revenue_non_profit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.revenue_non_profit}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenue_non_profit: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenses_for_profit">For-Profit Expenses ($)</Label>
                <Input
                  id="expenses_for_profit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expenses_for_profit}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenses_for_profit: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expenses_non_profit">Non-Profit Expenses ($)</Label>
                <Input
                  id="expenses_non_profit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expenses_non_profit}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenses_non_profit: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Impact Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Impact Metrics</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="participants_count">Participants</Label>
                <Input
                  id="participants_count"
                  type="number"
                  min="0"
                  value={formData.participants_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, participants_count: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="beneficiaries_count">Beneficiaries</Label>
                <Input
                  id="beneficiaries_count"
                  type="number"
                  min="0"
                  value={formData.beneficiaries_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, beneficiaries_count: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="volunteer_hours">Volunteer Hours</Label>
                <Input
                  id="volunteer_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.volunteer_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, volunteer_hours: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Compliance Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Compliance & Notes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="compliance_notes">Compliance Notes</Label>
              <Textarea
                id="compliance_notes"
                value={formData.compliance_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, compliance_notes: e.target.value }))}
                placeholder="Add any compliance requirements or regulatory notes"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {activity ? 'Update Activity' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}