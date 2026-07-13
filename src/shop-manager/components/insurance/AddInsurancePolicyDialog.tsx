import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInsurancePolicies } from "@/hooks/useInsurancePolicies";
import { InsuranceFormData, INSURANCE_TYPES, PAYMENT_FREQUENCIES } from "@/types/insurance";

interface AddInsurancePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialFormData: InsuranceFormData = {
  policy_number: '',
  insurance_provider: '',
  insurance_type: 'comprehensive',
  coverage_description: '',
  coverage_amount: '',
  deductible: '',
  premium_amount: '',
  payment_frequency: 'annual',
  effective_date: '',
  expiration_date: '',
  renewal_reminder_days: '30',
  auto_renew: false,
  agent_name: '',
  agent_phone: '',
  agent_email: '',
  notes: '',
};

export function AddInsurancePolicyDialog({ open, onOpenChange }: AddInsurancePolicyDialogProps) {
  const [formData, setFormData] = useState<InsuranceFormData>(initialFormData);
  const [assetType, setAssetType] = useState<'equipment' | 'vehicle' | 'general'>('equipment');
  const { createPolicy } = useInsurancePolicies();

  // Fetch equipment options
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-for-insurance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, equipment_type')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch vehicle options
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-insurance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      equipment_id: assetType === 'equipment' ? formData.equipment_id : undefined,
      vehicle_id: assetType === 'vehicle' ? formData.vehicle_id : undefined,
    };

    createPolicy.mutate(submitData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData(initialFormData);
      },
    });
  };

  const updateField = (field: keyof InsuranceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Insurance Policy</DialogTitle>
          <DialogDescription>
            Create a new insurance policy for an asset or general coverage
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div className="space-y-4">
            <Label>Link to Asset</Label>
            <Tabs value={assetType} onValueChange={(v) => setAssetType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                <TabsTrigger value="general">General</TabsTrigger>
              </TabsList>

              <TabsContent value="equipment" className="mt-4">
                <Select
                  value={formData.equipment_id || ''}
                  onValueChange={(value) => updateField('equipment_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.equipment_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>

              <TabsContent value="vehicle" className="mt-4">
                <Select
                  value={formData.vehicle_id || ''}
                  onValueChange={(value) => updateField('vehicle_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>

              <TabsContent value="general" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  This policy will not be linked to a specific asset.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Policy Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="policy_number">Policy Number *</Label>
              <Input
                id="policy_number"
                value={formData.policy_number}
                onChange={(e) => updateField('policy_number', e.target.value)}
                placeholder="POL-2024-001"
                required
              />
            </div>
            <div>
              <Label htmlFor="insurance_provider">Insurance Provider *</Label>
              <Input
                id="insurance_provider"
                value={formData.insurance_provider}
                onChange={(e) => updateField('insurance_provider', e.target.value)}
                placeholder="State Farm"
                required
              />
            </div>
            <div>
              <Label htmlFor="insurance_type">Insurance Type *</Label>
              <Select
                value={formData.insurance_type}
                onValueChange={(value) => updateField('insurance_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment_frequency">Payment Frequency *</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(value) => updateField('payment_frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="premium_amount">Premium Amount *</Label>
              <Input
                id="premium_amount"
                type="number"
                value={formData.premium_amount}
                onChange={(e) => updateField('premium_amount', e.target.value)}
                placeholder="5000"
                required
              />
            </div>
            <div>
              <Label htmlFor="coverage_amount">Coverage Amount</Label>
              <Input
                id="coverage_amount"
                type="number"
                value={formData.coverage_amount}
                onChange={(e) => updateField('coverage_amount', e.target.value)}
                placeholder="100000"
              />
            </div>
            <div>
              <Label htmlFor="deductible">Deductible</Label>
              <Input
                id="deductible"
                type="number"
                value={formData.deductible}
                onChange={(e) => updateField('deductible', e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => updateField('effective_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="expiration_date">Expiration Date *</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => updateField('expiration_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="renewal_reminder_days">Reminder (days before)</Label>
              <Input
                id="renewal_reminder_days"
                type="number"
                value={formData.renewal_reminder_days}
                onChange={(e) => updateField('renewal_reminder_days', e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Auto Renew */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_renew"
              checked={formData.auto_renew}
              onCheckedChange={(checked) => updateField('auto_renew', checked)}
            />
            <Label htmlFor="auto_renew">Auto-renew policy</Label>
          </div>

          {/* Agent Contact */}
          <div className="space-y-4">
            <h4 className="font-medium">Agent Contact (Optional)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="agent_name">Agent Name</Label>
                <Input
                  id="agent_name"
                  value={formData.agent_name}
                  onChange={(e) => updateField('agent_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="agent_phone">Phone</Label>
                <Input
                  id="agent_phone"
                  value={formData.agent_phone}
                  onChange={(e) => updateField('agent_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="agent_email">Email</Label>
                <Input
                  id="agent_email"
                  type="email"
                  value={formData.agent_email}
                  onChange={(e) => updateField('agent_email', e.target.value)}
                  placeholder="agent@insurance.com"
                />
              </div>
            </div>
          </div>

          {/* Coverage Description & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="coverage_description">Coverage Description</Label>
              <Textarea
                id="coverage_description"
                value={formData.coverage_description}
                onChange={(e) => updateField('coverage_description', e.target.value)}
                placeholder="Full hull coverage including..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPolicy.isPending}>
              {createPolicy.isPending ? 'Creating...' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
