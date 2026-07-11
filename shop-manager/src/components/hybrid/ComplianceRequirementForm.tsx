import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { hybridActivitiesService } from "@/services/hybridActivitiesService";
import { ComplianceRequirement, CreateComplianceRequirementData } from "@/types/hybrid";

interface ComplianceRequirementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement?: ComplianceRequirement;
  onSuccess: () => void;
}

export function ComplianceRequirementForm({ open, onOpenChange, requirement, onSuccess }: ComplianceRequirementFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    requirement?.due_date ? new Date(requirement.due_date) : undefined
  );
  const [documentationRequired, setDocumentationRequired] = useState<string[]>(
    requirement?.documentation_required || []
  );
  const [newDoc, setNewDoc] = useState('');

  const [formData, setFormData] = useState<CreateComplianceRequirementData>({
    requirement_name: requirement?.requirement_name || '',
    requirement_type: requirement?.requirement_type || '',
    description: requirement?.description || '',
    applicable_to: requirement?.applicable_to || 'both',
    completion_status: requirement?.completion_status || 'pending',
    priority_level: requirement?.priority_level || 'medium',
    frequency: requirement?.frequency || '',
    cost_to_comply: requirement?.cost_to_comply || 0,
    penalties_for_non_compliance: requirement?.penalties_for_non_compliance || '',
    responsible_person: requirement?.responsible_person || '',
    auto_renew: requirement?.auto_renew || false,
    notes: requirement?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requirementData = {
        ...formData,
        due_date: dueDate?.toISOString().split('T')[0],
        documentation_required: documentationRequired.length > 0 ? documentationRequired : undefined,
      };

      if (requirement) {
        await hybridActivitiesService.updateComplianceRequirement(requirement.id, requirementData);
        toast({
          title: "Requirement Updated",
          description: "Compliance requirement has been updated successfully.",
        });
      } else {
        await hybridActivitiesService.createComplianceRequirement(requirementData);
        toast({
          title: "Requirement Created",
          description: "Compliance requirement has been created successfully.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving requirement:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save requirement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addDocumentation = () => {
    if (newDoc.trim()) {
      setDocumentationRequired([...documentationRequired, newDoc.trim()]);
      setNewDoc('');
    }
  };

  const removeDocumentation = (index: number) => {
    setDocumentationRequired(documentationRequired.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {requirement ? 'Edit Compliance Requirement' : 'Create Compliance Requirement'}
          </DialogTitle>
          <DialogDescription>
            {requirement 
              ? 'Update the details of this compliance requirement'
              : 'Create a new compliance requirement to track regulatory obligations'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requirement_name">Requirement Name *</Label>
                <Input
                  id="requirement_name"
                  value={formData.requirement_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement_name: e.target.value }))}
                  placeholder="Enter requirement name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requirement_type">Requirement Type *</Label>
                <Select
                  value={formData.requirement_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requirement_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requirement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tax_filing">Tax Filing</SelectItem>
                    <SelectItem value="regulatory_report">Regulatory Report</SelectItem>
                    <SelectItem value="license_renewal">License Renewal</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="financial_disclosure">Financial Disclosure</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
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
                placeholder="Describe the compliance requirement"
                rows={3}
              />
            </div>
          </div>

          {/* Applicability and Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Applicability & Status</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicable_to">Applies To *</Label>
                <Select
                  value={formData.applicable_to}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, applicable_to: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_profit">For-Profit Only</SelectItem>
                    <SelectItem value="non_profit">Non-Profit Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="completion_status">Status</Label>
                <Select
                  value={formData.completion_status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, completion_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority Level *</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Timeline and Frequency */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Timeline & Frequency</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="biannually">Bi-annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_renew"
                checked={formData.auto_renew}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renew: checked }))}
              />
              <Label htmlFor="auto_renew">Auto-renew this requirement</Label>
            </div>
          </div>

          {/* Cost and Responsibility */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Cost & Responsibility</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_to_comply">Cost to Comply ($)</Label>
                <Input
                  id="cost_to_comply"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_to_comply}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_to_comply: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="responsible_person">Responsible Person</Label>
                <Input
                  id="responsible_person"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsible_person: e.target.value }))}
                  placeholder="Name or role"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="penalties_for_non_compliance">Penalties for Non-Compliance</Label>
              <Textarea
                id="penalties_for_non_compliance"
                value={formData.penalties_for_non_compliance}
                onChange={(e) => setFormData(prev => ({ ...prev, penalties_for_non_compliance: e.target.value }))}
                placeholder="Describe potential penalties or consequences"
                rows={2}
              />
            </div>
          </div>

          {/* Documentation Required */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Documentation Required</h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newDoc}
                  onChange={(e) => setNewDoc(e.target.value)}
                  placeholder="Add documentation requirement"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocumentation())}
                />
                <Button type="button" onClick={addDocumentation} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {documentationRequired.length > 0 && (
                <div className="space-y-1">
                  {documentationRequired.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{doc}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocumentation(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Additional Notes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes or requirements"
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
              {requirement ? 'Update Requirement' : 'Create Requirement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}